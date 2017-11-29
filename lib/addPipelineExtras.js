'use strict';
var Cesium = require('cesium');
var ForEach = require('./ForEach');

var defaultValue = Cesium.defaultValue;

module.exports = addPipelineExtras;

/**
 * Adds extras._pipeline to each object that can have extras in the glTF asset.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @returns {Object} The glTF asset with the added pipeline extras.
 *
 * @private
 */
function addPipelineExtras(gltf) {
    ForEach.image(gltf, function (image) {
        addExtras(image);
    });
    ForEach.shader(gltf, function(shader) {
        addExtras(shader);
    });
    ForEach.buffer(gltf, function(buffer) {
        addExtras(buffer);
    });
    return gltf;
}

function addExtras(object) {
    object.extras = defaultValue(object.extras, {});
    object.extras._pipeline = defaultValue(object.extras._pipeline, {});
}
