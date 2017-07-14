'use strict';
var Cesium = require('cesium');

var defined = Cesium.defined;

module.exports = removePipelineExtras;

/**
 * Iterate through the objects within the glTF and delete their pipeline extras object.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @returns {Object} glTF with no pipeline extras.
 */
function removePipelineExtras(gltf) {
    var objectStack = [gltf];
    while (objectStack.length > 0) {
        var object = objectStack.pop();
        if (defined(object) && (typeof object === 'object')) {
            if (defined(object.extras) && defined(object.extras._pipeline)) {
                delete object.extras._pipeline;
                // Also delete extras if extras._pipeline is the only extras object
                if (Object.keys(object.extras).length === 0) {
                    delete object.extras;
                }
            }
            for (var name in object) {
                if (object.hasOwnProperty(name)) {
                    objectStack.push(object[name]);
                }
            }
        }
    }
    return gltf;
}
