'use strict';
var Cesium = require('cesium');
var fsExtra = require('fs-extra');
var Jimp = require('jimp');
var mime = require('mime');
var path = require('path');
var Promise = require('bluebird');
var ForEach = require('./ForEach');
var getImageExtension = require('./getImageExtension');
var mergeBuffers = require('./mergeBuffers');

Jimp.prototype.getBufferAsync = Promise.promisify(Jimp.prototype.getBuffer);

var Check = Cesium.Check;
var defaultValue = Cesium.defaultValue;
var defined = Cesium.defined;

// .crn (Crunch) is not a supported mime type, so add it
mime.define({'image/crn': ['crn']});

module.exports = writeResources;

/**
 * Write glTF resources as data uris, buffer views, or files.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {Object} [options] Object with the following properties;.
 * @param {String} [options.basePath] The base path to write external files.
 * @param {Boolean} [options.separateBuffers=false] Whether to save buffers as separate files.
 * @param {Boolean} [options.separateTextures=false] Whether to save images as separate files.
 * @param {Boolean} [options.separateShaders=false] Whether to save shaders as separate files.
 * @param {Boolean} [options.dataUris=false] Write embedded resources as data uris instead of buffer views.
 * @param {Object} [options.bufferStorage] When defined, the glTF buffer's underlying Buffer object will be saved here instead of encoded as a data uri.
 * @returns {Promise} A promise that resolves to the glTF asset when all resources are written.
 *
 * @private
 */
function writeResources(gltf, options) {
    Check.typeOf.object('gltf', gltf);

    options = defaultValue(options, {});
    options.separateBuffers = defaultValue(options.separateBuffers, false);
    options.separateTextures = defaultValue(options.separateTextures, false);
    options.separateShaders = defaultValue(options.separateShaders, false);
    options.dataUris = defaultValue(options.dataUris, false);

    var promises = [];

    ForEach.image(gltf, function(image, i) {
        promises.push(writeImage(gltf, image, i, options));
    });

    ForEach.shader(gltf, function(shader, i) {
        promises.push(writeShader(gltf, shader, i, options));
    });

    // Write compressed images
    ForEach.image(gltf, function (image, i) {
        var compressedImages = image.extras.compressedImage3DTiles;
        for (var type in compressedImages) {
            if (compressedImages.hasOwnProperty(type)) {
                var compressedImage = compressedImages[type];
                promises.push(writeImage(gltf, compressedImage, i, options));
            }
        }
    });

    // Buffers need to be written last because images and shaders may write to new buffers
    return Promise.all(promises)
        .then(function() {
            mergeBuffers(gltf);
            return writeBuffer(gltf, gltf.buffers[0], 0, options);
        })
        .thenReturn(gltf);
}

function writeBuffer(gltf, buffer, i, options) {
    if (defined(options.bufferStorage)) {
        options.bufferStorage.buffer = buffer.extras._pipeline.source;
        return Promise.resolve();
    }
    return writeResource(gltf, buffer, i, options.separateBuffers, true, '.bin', options);
}

function writeImage(gltf, image, i, options) {
    var extension = getImageExtension(image.extras._pipeline.source);
    return writeJimpImage(image, extension)
        .then(function() {
            return writeResource(gltf, image, i, options.separateTextures, options.dataUris, extension, options);
        })
        .then(function() {
            if (defined(image.bufferView)) {
                // Preserve the image mime type when writing to a buffer view
                image.mimeType = mime.getType(extension);
            }
        });
}

function writeShader(gltf, shader, i, options) {
    return writeResource(gltf, shader, i, options.separateShaders, options.dataUris, '.glsl', options);
}

function writeResource(gltf, object, index, separate, dataUris, extension, options) {
    if (separate) {
        return writeFile(object, index, extension, options);
    } else if (dataUris) {
        return Promise.resolve(writeDataUri(object, extension));
    }
    return Promise.resolve(writeBufferView(gltf, object));
}

function writeDataUri(object, extension) {
    delete object.bufferView;
    var source = object.extras._pipeline.source;
    var mimeType = mime.getType(extension);
    object.uri = 'data:' + mimeType + ';base64,' + source.toString('base64');
}

function writeBufferView(gltf, object) {
    delete object.uri;
    if (defined(object.bufferView)) {
        return;
    }
    var source = object.extras._pipeline.source;
    var byteLength = source.length;
    var buffers = gltf.buffers;
    var bufferViews = gltf.bufferViews;

    object.bufferView = bufferViews.length;
    bufferViews.push({
        buffer : buffers.length,
        byteOffset : 0,
        byteLength : byteLength
    });
    buffers.push({
        byteLength : byteLength,
        extras : {
            _pipeline : {
                source : source
            }
        }
    });
}

function writeFile(object, index, extension, options) {
    delete object.bufferView;
    var pipelineExtras = object.extras._pipeline;
    var source = pipelineExtras.source;
    var relativePath = pipelineExtras.relativePath;
    var basePath = options.basePath;

    if (!defined(relativePath)) {
        relativePath = defaultValue(object.name, index) + extension;
    }

    object.uri = relativePath.replace(/\\/g, '/');
    var outputPath = path.join(basePath, relativePath);
    return fsExtra.outputFile(outputPath, source);
}

function writeJimpImage(image, extension) {
    var pipelineExtras = image.extras._pipeline;
    var jimpImage = pipelineExtras.jimpImage;
    if (defined(jimpImage) && pipelineExtras.imageChanged) {
        var mimeType = mime.getType(extension);
        return jimpImage.getBufferAsync(mimeType)
            .then(function(data) {
                pipelineExtras.source = data;
            });
    }
    return Promise.resolve();
}
