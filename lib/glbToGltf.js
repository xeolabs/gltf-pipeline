'use strict';
var Promise = require('bluebird');
var addPipelineExtras = require('./addPipelineExtras');
var parseGlb = require('./parseGlb');
var readResources = require('./readResources');
var removePipelineExtras = require('./removePipelineExtras');
var updateVersion = require('./updateVersion');
var writeResources = require('./writeResources');

module.exports = glbToGltf;

/**
 * Convert a binary glTF to glTF.
 *
 * @param {Buffer} glb A buffer containing the glb contents.
 * @returns {Promise} A promise that resolves to an object containing a glTF asset.
 */
function glbToGltf(glb) {
    var gltf = parseGlb(glb);

    var stages = [
        updateVersion,
        addPipelineExtras,
        readResources,
        writeResources,
        removePipelineExtras
    ];

    return Promise.mapSeries(stages, function(stage) {
        return stage(gltf);
    }).then(function() {
        return gltf;
    });
}
