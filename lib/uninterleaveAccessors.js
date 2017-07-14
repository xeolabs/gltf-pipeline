'use strict';
var Cesium = require('cesium');
var ForEach = require('./ForEach');

var WebGLConstants = Cesium.WebGLConstants;
var defined = Cesium.defined;
var defaultValue = Cesium.defaultValue;

var byteLengthForComponentType = require('./byteLengthForComponentType');
var getAccessorByteStride = require('./getAccessorByteStride');
var numberOfComponentsForType = require('./numberOfComponentsForType');

module.exports = uninterleaveAccessors;

/**
 * Un-interleave accessors and repack buffer data into contiguous chunks.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @returns {Object} The glTF asset with repacked buffers.
 */
function uninterleaveAccessors(gltf) {
    var accessors = gltf.accessors;
    var bufferViews = gltf.bufferViews;
    var buffers = gltf.buffers;
    var accessorsForBufferViews = getAccessorsForBufferViews(gltf);
    ForEach.bufferView(gltf, function(bufferView, bufferViewId) {
        var accessorIds = accessorsForBufferViews[bufferViewid];


    });



    for (var accessorId in accessors) {
        if (accessors.hasOwnProperty(accessorId)) {
            var accessor = accessors[accessorId];



            var bufferView = bufferViews[accessor.bufferView];
            var buffer = buffers[bufferView.buffer];

            // acessor references a buffer view, buffer view references a buffer
            // Stride only applies if multiple accessors reference the same buffer view

            accessor.bufferView = accessor.extras._pipeline.bufferView;
        }
    }
    return gltf;
}

function getAccessorsForBufferViews(gltf) {
    var accessorsForBufferViews = {};
    ForEach.accessor(gltf, function(accessor, accessorId) {
        var bufferViewId = accessor.bufferView;
        var accessorsForBufferView = accessorsForBufferViews[bufferViewId];
        if (!defined(accessorsForBufferView)) {
            accessorsForBufferView = [];
            accessorsForBufferViews[bufferViewId] = accessorsForBufferView;
        }
        accessorsForBufferView.push(accessorId);
    });
    return accessorsForBufferViews;
}