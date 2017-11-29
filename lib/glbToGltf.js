'use strict';
var Promise = require('bluebird');
var addDefaults = require('./addDefaults');
var addPipelineExtras = require('./addPipelineExtras');
var parseGlb = require('./parseGlb');
var readResources = require('./readResources');
var removePipelineExtras = require('./removePipelineExtras');
var updateVersion = require('./updateVersion');
var writeResources = require('./writeResources');

module.exports = glbToGltf;

/**
 * Convert a glb to glTF.
 *
 * @param {Buffer} glb A buffer containing the glb contents.
 * @param {Object} [options] An object with the following properties:
 * @param {String} [options.basePath] The path to look in when reading external files.
 * @returns {Promise} A promise that resolves to an object containing a glTF asset.
 */
function glbToGltf(glb, options) {
    var stages = [
        updateVersion,
        addPipelineExtras,
        addDefaults,
        readResources,
        writeResources,
        removePipelineExtras
    ];

    var gltf = parseGlb(glb);
    return Promise.mapSeries(stages, function(stage) {
        return stage(gltf, options);
    }).then(function() {
        return gltf;
    });
}
