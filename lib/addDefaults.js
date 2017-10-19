'use strict';
var Cesium = require('cesium');
var addToArray = require('./addToArray');
var ForEach = require('./ForEach');

var clone = Cesium.clone;
var defaultValue = Cesium.defaultValue;
var defined = Cesium.defined;
var WebGLConstants = Cesium.WebGLConstants;

module.exports = addDefaults;

var materialsCommonDefaults = {
    ambient : [0.0, 0.0, 0.0, 1.0],
    diffuse : [0.0, 0.0, 0.0, 1.0],
    emission : [0.0, 0.0, 0.0, 1.0],
    specular : [0.0, 0.0, 0.0, 1.0],
    shininess : 0.0,
    transparency : 1.0,
    transparent : false,
    doubleSided : false
};

function addTextureDefaults(texture) {
    if (defined(texture)) {
        texture.texCoord = defaultValue(texture.texCoord, 0);
    }
}

function addDefaults(gltf) {
    ForEach.accessor(gltf, function(accessor) {
        accessor.byteStride = defaultValue(accessor.byteStride, 0);
        accessor.normalized = defaultValue(accessor.normalized, false);
    });

    ForEach.animation(gltf, function(animation) {
        ForEach.animationSampler(animation, function(sampler) {
            sampler.interpolation = defaultValue(sampler.interpolation, 'LINEAR');
        });
    });

    ForEach.bufferView(gltf, function(bufferView) {
        bufferView.byteOffset = defaultValue(bufferView.byteOffset, 0);
    });

    ForEach.mesh(gltf, function(mesh) {
        ForEach.meshPrimitive(mesh, function(primitive) {
            primitive.mode = defaultValue(primitive.mode, WebGLConstants.TRIANGLES);
        });
    });

    ForEach.material(gltf, function(material) {
        var extensionsUsed = gltf.extensionsUsed;
        if (defined(extensionsUsed) && defined(extensionsUsed.KHR_technique_webgl)) {
            // glTF 1.0 style material - no default values to set
            return;
        }

        var extensions = material.extensions;
        var materialsCommon = extensions.KHR_materials_common;
        if (defined(materialsCommon)) {
            var technique = materialsCommon.technique;
            var values = materialsCommon.values;

            values.ambient = defaultValue(values.ambient, materialsCommonDefaults.ambient);
            values.emission = defaultValue(values.emission, materialsCommonDefaults.emission);

            values.transparency = defaultValue(values.transparency, materialsCommonDefaults.transparency);
            values.transparent = defaultValue(values.transparent, materialsCommonDefaults.transparent);
            values.doubleSided = defaultValue(values.doubleSided, materialsCommonDefaults.doubleSided);

            if (technique !== 'CONSTANT') {
                values.diffuse = defaultValue(values.diffuse, materialsCommonDefaults.diffuse);
                if (technique !== 'LAMBERT') {
                    values.specular = defaultValue(values.specular, materialsCommonDefaults.specular);
                    values.shininess = defaultValue(values.shininess, materialsCommonDefaults.shininess);
                }
            }
            return;
        }

        material.emissiveFactor = defaultValue(material.emissiveFactor, [0.0, 0.0, 0.0, 1.0]);
        material.alphaMode = defaultValue(material.alphaMode, 'OPAQUE');
        material.doubleSided = defaultValue(material.doubleSided, false);

        if (material.alphaMode === 'MASK') {
            material.alphaCutoff = defaultValue(material.alphaCutoff, 0.5);
        }

        addTextureDefaults(material.emissiveTexture);
        addTextureDefaults(material.normalTexture);
        addTextureDefaults(material.occlusionTexture);

        var pbrMetallicRoughness = material.pbrMetallicRoughness;
        if (defined(pbrMetallicRoughness)) {
            pbrMetallicRoughness.baseColorFactor = defaultValue(pbrMetallicRoughness.baseColorFactor, [1.0, 1.0, 1.0, 1.0]);
            pbrMetallicRoughness.metallicFactor = defaultValue(pbrMetallicRoughness.metallicFactor, 1.0);
            pbrMetallicRoughness.roughnessFactor = defaultValue(pbrMetallicRoughness.roughnessFactor, 1.0);
            addTextureDefaults(material.baseColorTexture);
            addTextureDefaults(material.metallicRoughnessTexture);
        }

        var pbrSpecularGlossiness = extensions.pbrSpecularGlossiness;
        if (defined(pbrSpecularGlossiness)) {
            pbrSpecularGlossiness.diffuseFactor = defaultValue(pbrSpecularGlossiness.diffuseFactor, [1.0, 1.0, 1.0, 1.0]);
            pbrSpecularGlossiness.specularFactor = defaultValue(pbrSpecularGlossiness.specularFactor, [1.0, 1.0, 1.0]);
            pbrSpecularGlossiness.glossinessFactor = defaultValue(pbrSpecularGlossiness.glossinessFactor, 1.0);
            addTextureDefaults(material.specularGlossinessTexture);
        }
    });

    ForEach.node(gltf, function(node) {
        if (defined(node.translation) || defined(node.rotation) || defined(node.scale)) {
            node.translation = defaultValue(node.translation, [0.0, 0.0, 0.0]);
            node.rotation = defaultValue(node.rotation, [0.0, 0.0, 0.0, 1.0]);
            node.scale = defaultValue(node.scale, [1.0, 1.0, 1.0]);
        } else {
            node.matrix = defaultValue(node.matrix, [1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0]);
        }
    });

    ForEach.sampler(gltf, function(sampler) {
        sampler.wrapS = defaultValue(sampler.wrapS, WebGLConstants.REPEAT);
        sampler.wrapT = defaultValue(sampler.wrapT, WebGLConstants.REPEAT);
    });
}

var defaultTechnique = {
    attributes : {
        a_position : 'position'
    },
    parameters : {
        modelViewMatrix : {
            semantic : 'MODELVIEW',
            type : WebGLConstants.FLOAT_MAT4
        },
        projectionMatrix : {
            semantic : 'PROJECTION',
            type : WebGLConstants.FLOAT_MAT4
        },
        emission : {
            type : WebGLConstants.FLOAT_VEC4,
            value : [
                0.5, 0.5, 0.5, 1.0
            ]
        },
        position : {
            semantic: 'POSITION',
            type: WebGLConstants.FLOAT_VEC3
        }
    },
    states : {
        enable : [
            WebGLConstants.CULL_FACE,
            WebGLConstants.DEPTH_TEST
        ]
    },
    uniforms : {
        u_modelViewMatrix : 'modelViewMatrix',
        u_projectionMatrix : 'projectionMatrix',
        u_emission : 'emission'
    }
};

var defaultProgram = {
    attributes : [
        'a_position'
    ]
};

var defaultVertexShader = {
    type : WebGLConstants.VERTEX_SHADER,
    extras : {
        _pipeline : {
            extension : '.vert',
            source : '' +
                'precision highp float;\n' +
                '\n' +
                'uniform mat4 u_modelViewMatrix;\n' +
                'uniform mat4 u_projectionMatrix;\n' +
                '\n' +
                'attribute vec3 a_position;\n' +
                '\n' +
                'void main (void)\n' +
                '{\n' +
                '    gl_Position = u_projectionMatrix * u_modelViewMatrix * vec4(a_position, 1.0);\n' +
                '}\n'
        }
    }
};

var defaultFragmentShader = {
    type : WebGLConstants.FRAGMENT_SHADER,
    extras : {
        _pipeline : {
            extension: '.frag',
            source : '' +
                'precision highp float;\n' +
                '\n' +
                'uniform vec4 u_emission;\n' +
                '\n' +
                'void main(void)\n' +
                '{\n' +
                '    gl_FragColor = u_emission;\n' +
                '}\n'
        }
    }
};

function addDefaultMaterial(gltf) {
    var materials = gltf.materials;
    var meshes = gltf.meshes;

    var defaultMaterialId;

    var meshesLength = meshes.length;
    for (var meshId = 0; meshId < meshesLength; meshId++) {
        var mesh = meshes[meshId];
        var primitives = mesh.primitives;
        var primitivesLength = primitives.length;
        for (var j = 0; j < primitivesLength; j++) {
            var primitive = primitives[j];
            if (!defined(primitive.material)) {
                if (!defined(defaultMaterialId)) {
                    defaultMaterialId = addToArray(materials, clone(defaultMaterial, true));
                }
                primitive.material = defaultMaterialId;
            }
        }
    }
}

function addDefaultTechnique(gltf) {
    var materials = gltf.materials;
    var techniques = gltf.techniques;
    var programs = gltf.programs;
    var shaders = gltf.shaders;

    var defaultTechniqueId;

    var materialsLength = materials.length;
    for (var materialId = 0; materialId < materialsLength; materialId++) {
        var material = materials[materialId];
        var techniqueId = material.technique;
        var extensions = defaultValue(material.extensions, {});
        var materialsCommon = extensions.KHR_materials_common;
        if (!defined(techniqueId)) {
            if (!defined(defaultTechniqueId) && !defined(materialsCommon)) {
                var technique = clone(defaultTechnique, true);
                defaultTechniqueId = addToArray(techniques, technique);

                var program = clone(defaultProgram, true);
                technique.program = addToArray(programs, program);

                var vertexShader = clone(defaultVertexShader, true);
                program.vertexShader = addToArray(shaders, vertexShader);

                var fragmentShader = clone(defaultFragmentShader, true);
                program.fragmentShader = addToArray(shaders, fragmentShader);
            }
            material.technique = defaultTechniqueId;
        }

    }
}

function addDefaultByteOffsets(gltf) {
    var accessors = gltf.accessors;

    var accessorLength = accessors.length;
    for (var i = 0; i < accessorLength; i++) {
        var accessor = accessors[i];
        if (!defined(accessor.byteOffset)) {
            accessor.byteOffset = 0;
        }
    }

    var bufferViews = gltf.bufferViews;

    var bufferViewsLength = bufferViews.length;
    for (var j = 0; j < bufferViewsLength; j++) {
        var bufferView = bufferViews[j];
        if (!defined(bufferView.byteOffset)) {
            bufferView.byteOffset = 0;
        }
    }
}

function selectDefaultScene(gltf) {
    if (defined(gltf.scenes) && !defined(gltf.scene)) {
        gltf.scene = 0;
    }
}

function optimizeForCesium(gltf) {
    // Give the diffuse uniform a semantic to support color replacement in 3D Tiles
    var techniques = gltf.techniques;
    var techniquesLength = techniques.length;
    for (var techniqueId = 0; techniqueId < techniquesLength; techniqueId++) {
        var technique = techniques[techniqueId];
        var parameters = technique.parameters;
        if (defined(parameters.diffuse)) {
            parameters.diffuse.semantic = '_3DTILESDIFFUSE';
        }
    }
}

function inferBufferViewTargets(gltf) {
    // If bufferView elements are missing targets, we can infer their type from their use
    var needsTarget = {};
    var shouldTraverse = 0;
    ForEach.bufferView(gltf, function(bufferView, bufferViewId) {
        if (!defined(bufferView.target)) {
            needsTarget[bufferViewId] = true;
            shouldTraverse++;
        }
    });
    if (shouldTraverse > 0) {
        var accessors = gltf.accessors;
        var bufferViews = gltf.bufferViews;
        ForEach.mesh(gltf, function (mesh) {
            ForEach.meshPrimitive(mesh, function (primitive) {
                var indices = primitive.indices;
                if (defined(indices)) {
                    var accessor = accessors[indices];
                    var bufferViewId = accessor.bufferView;
                    if (needsTarget[bufferViewId]) {
                        var bufferView = bufferViews[bufferViewId];
                        if (defined(bufferView)) {
                            bufferView.target = WebGLConstants.ELEMENT_ARRAY_BUFFER;
                            needsTarget[bufferViewId] = false;
                            shouldTraverse--;
                        }
                    }
                }
                ForEach.meshPrimitiveAttribute(primitive, function (accessorId) {
                    var accessor = accessors[accessorId];
                    var bufferViewId = accessor.bufferView;
                    if (needsTarget[bufferViewId]) {
                        var bufferView = bufferViews[bufferViewId];
                        if (defined(bufferView)) {
                            bufferView.target = WebGLConstants.ARRAY_BUFFER;
                            needsTarget[bufferViewId] = false;
                            shouldTraverse--;
                        }
                    }
                });
                ForEach.meshPrimitiveTargetAttribute(primitive, function (targetAttribute) {
                    var bufferViewId = accessors[targetAttribute].bufferView;
                    if (needsTarget[bufferViewId]) {
                        var bufferView = bufferViews[bufferViewId];
                        if (defined(bufferView)) {
                            bufferView.target = WebGLConstants.ARRAY_BUFFER;
                            needsTarget[bufferViewId] = false;
                            shouldTraverse--;
                        }
                    }
                });
            });
            if (shouldTraverse === 0) {
                return true;
            }
        });
    }
}

/**
 * Adds default glTF values if they don't exist.
 *
 * The glTF asset must be initialized for the pipeline.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {Object} [options] An object with the following properties:
 * @param {Boolean} [options.optimizeForCesium] Optimize the defaults for Cesium. Uses the Cesium sun as the default light source.
 * @returns {Object} The modified glTF.
 *
 * @see addPipelineExtras
 * @see loadGltfUris
 */
function addDefaults(gltf, options) {
    options = defaultValue(options, {});
    addDefaultsFromTemplate(gltf, gltfTemplate);
    addDefaultMaterial(gltf);
    addDefaultTechnique(gltf);
    addDefaultByteOffsets(gltf);
    selectDefaultScene(gltf);
    inferBufferViewTargets(gltf);
    if (options.optimizeForCesium) {
        optimizeForCesium(gltf);
    }
    return gltf;
}
