'use strict';
var Cesium = require('cesium');
var ForEach = require('./ForEach');

var defined = Cesium.defined;

module.exports = removePipelineExtras;

/**
 * Iterate through the objects within the glTF and delete their pipeline extras object.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @returns {Object} glTF with no pipeline extras.
 */
function removePipelineExtras(gltf) {
    ForEach.image(gltf, function (image) {
        deleteExtras(image);
    });
    ForEach.shader(gltf, function(shader) {
        deleteExtras(shader);
    });
    ForEach.buffer(gltf, function(buffer) {
        deleteExtras(buffer);
    });
    return gltf;
}

function deleteExtras(object) {
    if (defined(object.extras) && defined(object.extras._pipeline)) {
        delete object.extras._pipeline;
    }
    if (Object.keys(object.extras).length === 0) {
        delete object.extras;
    }
}
