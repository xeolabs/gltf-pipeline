// #!/usr/bin/env node
// 'use strict';
// var args = process.argv;
// var gltfPath = args[2];
// var glbPath = gltfPath.slice(0, -5) + '.glb';
//
// var fsExtra = require('fs-extra');
// var gltfToGlb = require('../lib/gltfToGlb');
//
// var gltfContents = fsExtra.readFileSync(gltfPath);
// var gltf = JSON.parse(gltfContents);
// gltfToGlb(gltf)
//     .then(function(glb) {
//         fsExtra.outputFileSync(glbPath, glb);
//     });

'use strict';
var args = process.argv;
var glbPath = args[2];
var gltfPath = glbPath.slice(0, -4) + '.gltf';

var fsExtra = require('fs-extra');
var glbToGltf = require('../lib/glbToGltf');

var glb = fsExtra.readFileSync(glbPath);
glbToGltf(glb)
    .then(function(gltf) {
        fsExtra.outputJsonSync(gltfPath, gltf);
    });
