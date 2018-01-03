'use strict';
var Cesium = require('cesium');
var addExtensionsRequired = require('./addExtensionsRequired');
var addToArray = require('./addToArray');
var findAccessorMinMax = require('./findAccessorMinMax');
var ForEach = require('./ForEach');
var getAccessorByteStride = require('./getAccessorByteStride');
var numberOfComponentsForType = require('./numberOfComponentsForType');

var Cartesian3 = Cesium.Cartesian3;
var CesiumMath = Cesium.Math;
var clone = Cesium.clone;
var ComponentDatatype = Cesium.ComponentDatatype;
var defaultValue = Cesium.defaultValue;
var defined = Cesium.defined;
var Quaternion = Cesium.Quaternion;
var WebGLConstants = Cesium.WebGLConstants;

module.exports = updateVersion;

var updateFunctions = {
    '0.8' : glTF08to10,
    '1.0' : glTF10to20,
    '2.0' : undefined
};

/**
 * Update the glTF version to the latest version (2.0), or targetVersion if specified.
 * Applies changes made to the glTF spec between revisions so that the core library
 * only has to handle the latest version.
 *
 * @param {Object} gltf A javascript object containing a glTF asset.
 * @param {Object} [options] Options for updating the glTF.
 * @param {String} [options.targetVersion] The glTF will be upgraded until it hits the specified version.
 * @returns {Object} The updated glTF asset.
 */
function updateVersion(gltf, options) {
    options = defaultValue(options, defaultValue.EMPTY_OBJECT);
    var targetVersion = options.targetVersion;
    var version = gltf.version;

    gltf.asset = defaultValue(gltf.asset, {
        version : '1.0'
    });

    version = defaultValue(version, gltf.asset.version).toString();

    // Invalid version
    if (!updateFunctions.hasOwnProperty(version)) {
        // Try truncating trailing version numbers, could be a number as well if it is 0.8
        if (defined(version)) {
            version = version.substring(0, 3);
        }
        // Default to 1.0 if it cannot be determined
        if (!updateFunctions.hasOwnProperty(version)) {
            version = '1.0';
        }
    }

    var updateFunction = updateFunctions[version];

    while (defined(updateFunction)) {
        if (version === targetVersion) {
            break;
        }
        updateFunction(gltf);
        version = gltf.asset.version;
        updateFunction = updateFunctions[version];
    }
    return gltf;
}

function updateInstanceTechniques(gltf) {
    var materials = gltf.materials;
    for (var materialId in materials) {
        if (materials.hasOwnProperty(materialId)) {
            var material = materials[materialId];
            var instanceTechnique = material.instanceTechnique;
            if (defined(instanceTechnique)) {
                material.technique = instanceTechnique.technique;
                material.values = instanceTechnique.values;
                delete material.instanceTechnique;
            }
        }
    }
}

function setPrimitiveModes(gltf) {
    var meshes = gltf.meshes;
    for (var meshId in meshes) {
        if (meshes.hasOwnProperty(meshId)) {
            var mesh = meshes[meshId];
            var primitives = mesh.primitives;
            if (defined(primitives)) {
                var primitivesLength = primitives.length;
                for (var i = 0; i < primitivesLength; ++i) {
                    var primitive = primitives[i];
                    var defaultMode = defaultValue(primitive.primitive, WebGLConstants.TRIANGLES);
                    primitive.mode = defaultValue(primitive.mode, defaultMode);
                    delete primitive.primitive;
                }
            }
        }
    }
}

function updateNodes(gltf) {
    var nodes = gltf.nodes;
    var axis = new Cartesian3();
    var quat = new Quaternion();
    for (var nodeId in nodes) {
        if (nodes.hasOwnProperty(nodeId)) {
            var node = nodes[nodeId];
            if (defined(node.rotation)) {
                var rotation = node.rotation;
                Cartesian3.fromArray(rotation, 0, axis);
                Quaternion.fromAxisAngle(axis, rotation[3], quat);
                node.rotation = [quat.x, quat.y, quat.z, quat.w];
            }
            var instanceSkin = node.instanceSkin;
            if (defined(instanceSkin)) {
                node.skeletons = instanceSkin.skeletons;
                node.skin = instanceSkin.skin;
                node.meshes = instanceSkin.meshes;
                delete node.instanceSkin;
            }
        }
    }
}

function updateAnimations(gltf) {
    var animations = gltf.animations;
    var accessors = gltf.accessors;
    var bufferViews = gltf.bufferViews;
    var buffers = gltf.buffers;
    var updatedAccessors = {};
    var axis = new Cartesian3();
    var quat = new Quaternion();
    for (var animationId in animations) {
        if (animations.hasOwnProperty(animationId)) {
            var animation = animations[animationId];
            var channels = animation.channels;
            var parameters = animation.parameters;
            var samplers = animation.samplers;
            if (defined(channels)) {
                var channelsLength = channels.length;
                for (var i = 0; i < channelsLength; ++i) {
                    var channel = channels[i];
                    if (channel.target.path === 'rotation') {
                        var accessorId = parameters[samplers[channel.sampler].output];
                        if (defined(updatedAccessors[accessorId])) {
                            continue;
                        }
                        updatedAccessors[accessorId] = true;
                        var accessor = accessors[accessorId];
                        var bufferView = bufferViews[accessor.bufferView];
                        var buffer = buffers[bufferView.buffer];
                        var source = buffer.extras._pipeline.source;
                        var byteOffset = source.byteOffset + bufferView.byteOffset + accessor.byteOffset;
                        var componentType = accessor.componentType;
                        var count = accessor.count;
                        var componentsLength = numberOfComponentsForType(accessor.type);
                        var length = accessor.count * componentsLength;
                        var typedArray = ComponentDatatype.createArrayBufferView(componentType, source.buffer, byteOffset, length);

                        for (var j = 0; j < count; j++) {
                            var offset = j * componentsLength;
                            Cartesian3.unpack(typedArray, offset, axis);
                            var angle = typedArray[offset + 3];
                            Quaternion.fromAxisAngle(axis, angle, quat);
                            Quaternion.pack(quat, typedArray, offset);
                        }
                    }
                }
            }
        }
    }
}

function removeTechniquePasses(gltf) {
    var techniques = gltf.techniques;
    for (var techniqueId in techniques) {
        if (techniques.hasOwnProperty(techniqueId)) {
            var technique = techniques[techniqueId];
            var passes = technique.passes;
            if (defined(passes)) {
                var passName = defaultValue(technique.pass, 'defaultPass');
                if (passes.hasOwnProperty(passName)) {
                    var pass = passes[passName];
                    var instanceProgram = pass.instanceProgram;
                    technique.attributes = defaultValue(technique.attributes, instanceProgram.attributes);
                    technique.program = defaultValue(technique.program, instanceProgram.program);
                    technique.uniforms = defaultValue(technique.uniforms, instanceProgram.uniforms);
                    technique.states = defaultValue(technique.states, pass.states);
                }
                delete technique.passes;
                delete technique.pass;
            }
        }
    }
}

function glTF08to10(gltf) {
    if (!defined(gltf.asset)) {
        gltf.asset = {};
    }
    var asset = gltf.asset;
    asset.version = '1.0';
    // Profile should be an object, not a string
    if (!defined(asset.profile) || (typeof asset.profile === 'string')) {
        asset.profile = {};
    }
    // Version property should be in asset, not on the root element
    if (defined(gltf.version)) {
        delete gltf.version;
    }
    // material.instanceTechnique properties should be directly on the material
    updateInstanceTechniques(gltf);
    // primitive.primitive should be primitive.mode
    setPrimitiveModes(gltf);
    // node rotation should be quaternion, not axis-angle
    // node.instanceSkin is deprecated
    updateNodes(gltf);
    // animations that target rotations should be quaternion, not axis-angle
    updateAnimations(gltf);
    // technique.pass and techniques.passes are deprecated
    removeTechniquePasses(gltf);
    // gltf.lights -> khrMaterialsCommon.lights
    if (defined(gltf.lights)) {
        var extensions = defaultValue(gltf.extensions, {});
        gltf.extensions = extensions;
        var materialsCommon = defaultValue(extensions.KHR_materials_common, {});
        extensions.KHR_materials_common = materialsCommon;
        materialsCommon.lights = gltf.lights;
        delete gltf.lights;
    }
    // gltf.allExtensions -> extensionsUsed
    if (defined(gltf.allExtensions)) {
        gltf.extensionsUsed = gltf.allExtensions;
        delete gltf.allExtensions;
    }
}

function removeAnimationSamplersIndirection(gltf) {
    var animations = gltf.animations;
    for (var animationId in animations) {
        if (animations.hasOwnProperty(animationId)) {
            var animation = animations[animationId];
            var parameters = animation.parameters;
            if (defined(parameters)) {
                var samplers = animation.samplers;
                for (var samplerId in samplers) {
                    if (samplers.hasOwnProperty(samplerId)) {
                        var sampler = samplers[samplerId];
                        sampler.input = parameters[sampler.input];
                        sampler.output = parameters[sampler.output];
                    }
                }
                delete animation.parameters;
            }
        }
    }
}

function objectToArray(object, mapping) {
    var array = [];
    for (var id in object) {
        if (object.hasOwnProperty(id)) {
            var value = object[id];
            mapping[id] = array.length;
            array.push(value);
            if (!defined(value.name)) {
                value.name = id;
            }
        }
    }
    return array;
}

function objectsToArrays(gltf) {
    var i;
    var globalMapping = {
        accessors : {},
        animations : {},
        buffers : {},
        bufferViews : {},
        cameras : {},
        images : {},
        materials : {},
        meshes : {},
        nodes : {},
        programs : {},
        samplers : {},
        scenes : {},
        shaders : {},
        skins : {},
        textures : {},
        techniques : {}
    };

    // Map joint names to id names
    var jointName;
    var jointNameToId = {};
    var nodes = gltf.nodes;
    for (var id in nodes) {
        if (nodes.hasOwnProperty(id)) {
            jointName = nodes[id].jointName;
            if (defined(jointName)) {
                jointNameToId[jointName] = id;
            }
        }
    }

    // Convert top level objects to arrays
    for (var topLevelId in gltf) {
        if (gltf.hasOwnProperty(topLevelId) && defined(globalMapping[topLevelId])) {
            var objectMapping = {};
            var object = gltf[topLevelId];
            gltf[topLevelId] = objectToArray(object, objectMapping);
            globalMapping[topLevelId] = objectMapping;
        }
    }

    // Remap joint names to array indexes
    for (jointName in jointNameToId) {
        if (jointNameToId.hasOwnProperty(jointName)) {
            jointNameToId[jointName] = globalMapping.nodes[jointNameToId[jointName]];
        }
    }

    // Fix references
    if (defined(gltf.scene)) {
        gltf.scene = globalMapping.scenes[gltf.scene];
    }
    ForEach.bufferView(gltf, function(bufferView) {
        if (defined(bufferView.buffer)) {
            bufferView.buffer = globalMapping.buffers[bufferView.buffer];
        }
    });
    ForEach.accessor(gltf, function(accessor) {
        if (defined(accessor.bufferView)) {
            accessor.bufferView = globalMapping.bufferViews[accessor.bufferView];
        }
    });
    ForEach.shader(gltf, function(shader) {
        var extensions = shader.extensions;
        if (defined(extensions)) {
            var binaryGltf = extensions.KHR_binary_glTF;
            if (defined(binaryGltf)) {
                shader.bufferView = globalMapping.bufferViews[binaryGltf.bufferView];
                delete extensions.KHR_binary_glTF;
            }
            if (Object.keys(extensions).length === 0) {
                delete shader.extensions;
            }
        }
    });
    ForEach.program(gltf, function(program) {
        if (defined(program.vertexShader)) {
            program.vertexShader = globalMapping.shaders[program.vertexShader];
        }
        if (defined(program.fragmentShader)) {
            program.fragmentShader = globalMapping.shaders[program.fragmentShader];
        }
    });
    ForEach.technique(gltf, function(technique) {
        if (defined(technique.program)) {
            technique.program = globalMapping.programs[technique.program];
        }
        ForEach.techniqueParameter(technique, function(parameter) {
            if (defined(parameter.node)) {
                parameter.node = globalMapping.nodes[parameter.node];
            }
            var value = parameter.value;
            if (typeof value === 'string') {
                parameter.value = {
                    index : globalMapping.textures[value]
                };
            }
        });
    });
    ForEach.mesh(gltf, function(mesh) {
        ForEach.meshPrimitive(mesh, function(primitive) {
            if (defined(primitive.indices)) {
                primitive.indices = globalMapping.accessors[primitive.indices];
            }
            ForEach.meshPrimitiveAttribute(primitive, function(accessorId, semantic) {
                primitive.attributes[semantic] = globalMapping.accessors[accessorId];
            });
            if (defined(primitive.material)) {
                primitive.material = globalMapping.materials[primitive.material];
            }
        });
    });
    ForEach.node(gltf, function(node) {
        var children = node.children;
        if (defined(children)) {
            var childrenLength = children.length;
            for (i = 0; i < childrenLength; ++i) {
                children[i] = globalMapping.nodes[children[i]];
            }
        }
        if (defined(node.meshes)) {
            // Split out meshes on nodes
            var meshes = node.meshes;
            var meshesLength = meshes.length;
            if (meshesLength > 0) {
                node.mesh = globalMapping.meshes[meshes[0]];
                for (i = 1; i < meshesLength; ++i) {
                    var meshNode = {
                        mesh : globalMapping.meshes[meshes[i]]
                    };
                    var meshNodeId = addToArray(gltf.nodes, meshNode);
                    if (!defined(children)) {
                        children = [];
                        node.children = children;
                    }
                    children.push(meshNodeId);
                }
            }
            delete node.meshes;
        }
        if (defined(node.camera)) {
            node.camera = globalMapping.cameras[node.camera];
        }
        if (defined(node.skin)) {
            node.skin = globalMapping.skins[node.skin];
        }
        if (defined(node.skeletons)) {
            // Assign skeletons to skins
            var skeletons = node.skeletons;
            var skeletonsLength = skeletons.length;
            if ((skeletonsLength > 0) && defined(node.skin)) {
                var skin = gltf.skins[node.skin];
                skin.skeleton = globalMapping.nodes[skeletons[0]];
            }
            delete node.skeletons;
        }
        if (defined(node.jointName)) {
            delete node.jointName;
        }
    });
    ForEach.skin(gltf, function(skin) {
        if (defined(skin.inverseBindMatrices)) {
            skin.inverseBindMatrices = globalMapping.accessors[skin.inverseBindMatrices];
        }
        var jointNames = skin.jointNames;
        if (defined(jointNames)) {
            var joints = [];
            var jointNamesLength = jointNames.length;
            for (i = 0; i < jointNamesLength; ++i) {
                joints[i] = jointNameToId[jointNames[i]];
            }
            skin.joints = joints;
            delete skin.jointNames;
        }
    });
    ForEach.scene(gltf, function(scene) {
        var sceneNodes = scene.nodes;
        if (defined(sceneNodes)) {
            var sceneNodesLength = sceneNodes.length;
            for (i = 0; i < sceneNodesLength; ++i) {
                sceneNodes[i] = globalMapping.nodes[sceneNodes[i]];
            }
        }
    });
    ForEach.animation(gltf, function(animation) {
        var samplerMapping = {};
        animation.samplers = objectToArray(animation.samplers, samplerMapping);
        ForEach.animationSampler(animation, function(sampler) {
            sampler.input = globalMapping.accessors[sampler.input];
            sampler.output = globalMapping.accessors[sampler.output];
        });
        ForEach.animationChannel(animation, function(channel) {
            channel.sampler = samplerMapping[channel.sampler];
            var target = channel.target;
            if (defined(target)) {
                target.node = globalMapping.nodes[target.id];
                delete target.id;
            }
        });
    });
    ForEach.material(gltf, function(material) {
        if (defined(material.technique)) {
            material.technique = globalMapping.techniques[material.technique];
        }
        ForEach.materialValue(material, function(value, name) {
            if (typeof value === 'string') {
                material.values[name] = {
                    index : globalMapping.textures[value]
                };
            }
        });
        var extensions = material.extensions;
        if (defined(extensions)) {
            var materialsCommon = extensions.KHR_materials_common;
            if (defined(materialsCommon)) {
                ForEach.materialValue(materialsCommon, function(value, name) {
                    if (typeof value === 'string') {
                        materialsCommon.values[name] = {
                            index : globalMapping.textures[value]
                        };
                    }
                });
            }
        }
    });
    ForEach.image(gltf, function(image) {
        var extensions = image.extensions;
        if (defined(extensions)) {
            var binaryGltf = extensions.KHR_binary_glTF;
            if (defined(binaryGltf)) {
                image.bufferView = globalMapping.bufferViews[binaryGltf.bufferView];
                image.mimeType = binaryGltf.mimeType;
                delete extensions.KHR_binary_glTF;
            }
            if (Object.keys(extensions).length === 0) {
                delete image.extensions;
            }
        }
        if (defined(image.extras)) {
            var compressedImages = image.extras.compressedImage3DTiles;
            for (var type in compressedImages) {
                if (compressedImages.hasOwnProperty(type)) {
                    var compressedImage = compressedImages[type];
                    var compressedExtensions = compressedImage.extensions;
                    if (defined(compressedExtensions)) {
                        var compressedBinaryGltf = compressedExtensions.KHR_binary_glTF;
                        if (defined(compressedBinaryGltf)) {
                            compressedImage.bufferView = globalMapping.bufferViews[compressedBinaryGltf.bufferView];
                            compressedImage.mimeType = compressedBinaryGltf.mimeType;
                            delete compressedExtensions.KHR_binary_glTF;
                        }
                        if (Object.keys(extensions).length === 0) {
                            delete compressedImage.extensions;
                        }
                    }
                }
            }
        }
    });
    ForEach.texture(gltf, function(texture) {
        if (defined(texture.sampler)) {
            texture.sampler = globalMapping.samplers[texture.sampler];
        }
        if (defined(texture.source)) {
            texture.source = globalMapping.images[texture.source];
        }
    });
}

function stripAsset(gltf) {
    // asset.premultipliedAlpha is removed in glTF 2.0 however it is important
    // to preserve for assets using the KHR_technique_webgl extension
    var asset = gltf.asset;
    delete asset.profile;
}

var knownExtensions = {
    CESIUM_RTC : true,
    KHR_materials_common : true,
    WEB3D_quantized_attributes : true
};
function requireKnownExtensions(gltf) {
    var extensionsUsed = gltf.extensionsUsed;
    gltf.extensionsRequired = defaultValue(gltf.extensionsRequired, []);
    if (defined(extensionsUsed)) {
        var extensionsUsedLength = extensionsUsed.length;
        for (var i = 0; i < extensionsUsedLength; ++i) {
            var extension = extensionsUsed[i];
            if (defined(knownExtensions[extension])) {
                gltf.extensionsRequired.push(extension);
            }
        }
    }
}

function removeBufferType(gltf) {
    ForEach.buffer(gltf, function(buffer) {
        delete buffer.type;
    });
}

function requireAttributeSetIndex(gltf) {
    ForEach.mesh(gltf, function(mesh) {
        ForEach.meshPrimitive(mesh, function(primitive) {
            ForEach.meshPrimitiveAttribute(primitive, function(accessorId, semantic) {
                if (semantic === 'TEXCOORD') {
                    primitive.attributes.TEXCOORD_0 = accessorId;
                } else if (semantic === 'COLOR') {
                    primitive.attributes.COLOR_0 = accessorId;
                }
            });
            delete primitive.attributes.TEXCOORD;
            delete primitive.attributes.COLOR;
        });
    });
    ForEach.technique(gltf, function(technique) {
        ForEach.techniqueParameter(technique, function(parameter) {
            var semantic = parameter.semantic;
            if (defined(semantic)) {
                if (semantic === 'TEXCOORD') {
                    parameter.semantic = 'TEXCOORD_0';
                } else if (semantic === 'COLOR') {
                    parameter.semantic = 'COLOR_0';
                }
            }
        });
    });
}

var knownSemantics = {
    POSITION : true,
    NORMAL : true,
    TANGENT : true,
    TEXCOORD : true,
    COLOR : true,
    JOINT : true,
    WEIGHTS : true
};
function underscoreApplicationSpecificSemantics(gltf) {
    var mappedSemantics = {};
    ForEach.mesh(gltf, function(mesh) {
        ForEach.meshPrimitive(mesh, function(primitive) {
            ForEach.meshPrimitiveAttribute(primitive, function(accessorId, semantic) {
                if (semantic.charAt(0) !== '_') {
                    var setIndex = semantic.search(/_[0-9]+/g);
                    var strippedSemantic = semantic;
                    if (setIndex >= 0) {
                        strippedSemantic = semantic.substring(0, setIndex);
                    }
                    if (!defined(knownSemantics[strippedSemantic])) {
                        var newSemantic = '_' + semantic;
                        mappedSemantics[semantic] = newSemantic;
                    }
                }
            });
            for (var semantic in mappedSemantics) {
                if (mappedSemantics.hasOwnProperty(semantic)) {
                    var mappedSemantic = mappedSemantics[semantic];
                    var accessorId = primitive.attributes[semantic];
                    if (defined(accessorId)) {
                        delete primitive.attributes[semantic];
                        primitive.attributes[mappedSemantic] = accessorId;
                    }
                }
            }
        });
    });
    ForEach.technique(gltf, function(technique) {
        ForEach.techniqueParameter(technique, function(parameter) {
            var mappedSemantic = mappedSemantics[parameter.semantic];
            if (defined(mappedSemantic)) {
                parameter.semantic = mappedSemantic;
            }
        });
    });
}

function removeScissorFromTechniques(gltf) {
    ForEach.technique(gltf, function(technique) {
        var techniqueStates = technique.states;
        if (defined(techniqueStates)) {
            var techniqueFunctions = techniqueStates.functions;
            if (defined(techniqueFunctions)) {
                delete techniqueFunctions.scissor;
            }
            var enableStates = techniqueStates.enable;
            if (defined(enableStates)) {
                var scissorIndex = enableStates.indexOf(WebGLConstants.SCISSOR_TEST);
                if (scissorIndex >= 0) {
                    enableStates.splice(scissorIndex, 1);
                }
            }
        }
    });
}

function clampTechniqueFunctionStates(gltf) {
    ForEach.technique(gltf, function(technique) {
        var techniqueStates = technique.states;
        if (defined(techniqueStates)) {
            var functions = techniqueStates.functions;
            if (defined(functions)) {
                var blendColor = functions.blendColor;
                if (defined(blendColor)) {
                    for (var i = 0; i < 4; ++i) {
                        blendColor[i] = CesiumMath.clamp(blendColor[i], 0.0, 1.0);
                    }
                }
                var depthRange = functions.depthRange;
                if (defined(depthRange)) {
                    depthRange[1] = CesiumMath.clamp(depthRange[1], 0.0, 1.0);
                    depthRange[0] = CesiumMath.clamp(depthRange[0], 0.0, depthRange[1]);
                }
            }
        }
    });
}

function clampCameraParameters(gltf) {
    ForEach.camera(gltf, function(camera) {
        var perspective = camera.perspective;
        if (defined(perspective)) {
            var aspectRatio = perspective.aspectRatio;
            if (defined(aspectRatio) && aspectRatio === 0.0) {
                delete perspective.aspectRatio;
            }
            var yfov = perspective.yfov;
            if (defined(yfov) && yfov === 0.0) {
                perspective.yfov = 1.0;
            }
        }
    });
}

function computeAccessorByteStride(gltf, accessor) {
    return (defined(accessor.byteStride) && accessor.byteStride !== 0) ? accessor.byteStride : getAccessorByteStride(gltf, accessor);
}

function requireByteLength(gltf) {
    ForEach.buffer(gltf, function(buffer) {
        if (!defined(buffer.byteLength)) {
            buffer.byteLength = buffer.extras._pipeline.source.length;
        }
    });
    ForEach.accessor(gltf, function(accessor) {
        var bufferViewId = accessor.bufferView;
        var bufferView = gltf.bufferViews[bufferViewId];
        var accessorByteStride = computeAccessorByteStride(gltf, accessor);
        var accessorByteEnd = accessor.byteOffset + accessor.count * accessorByteStride;
        bufferView.byteLength = Math.max(defaultValue(bufferView.byteLength, 0), accessorByteEnd);
    });
    // TODO : shaders, images, and compressedImage3DTiles that were embedded as binary glTF may be missing the byteLength property on their bufferView, and it's not clear how to calculate it. In practice this hasn't come up.
}

function moveByteStrideToBufferView(gltf) {
    var i;
    var j;
    var bufferView;
    var bufferViews = gltf.bufferViews;

    // Map buffer views to a list of accessors
    var bufferViewMap = {};
    ForEach.accessor(gltf, function(accessor) {
        bufferViewMap[accessor.bufferView] = defaultValue(bufferViewMap[accessor.bufferView], []);
        bufferViewMap[accessor.bufferView].push(accessor);
    });

    // Split accessors with different byte strides
    for (var bufferViewId in bufferViewMap) {
        if (bufferViewMap.hasOwnProperty(bufferViewId)) {
            bufferView = bufferViews[bufferViewId];
            var accessors = bufferViewMap[bufferViewId];
            accessors.sort(function(a, b) {
                return a.byteOffset - b.byteOffset;
            });
            var currentByteStride;
            var currentByteOffset = 0;
            var currentIndex = 0;
            var accessorsLength = accessors.length;
            for (i = 0; i < accessorsLength; ++i) {
                var accessor = accessors[i];
                var accessorByteStride = computeAccessorByteStride(gltf, accessor);
                var accessorByteOffset = accessor.byteOffset;
                var accessorByteLength = accessor.count * accessorByteStride;
                delete accessor.byteStride;
                currentByteStride = defaultValue(currentByteStride, accessorByteStride);
                if ((accessorByteStride !== currentByteStride) || (i === accessorsLength - 1)) {
                    var newBufferView = clone(bufferView, true);
                    newBufferView.byteStride = currentByteStride;
                    newBufferView.byteOffset += currentByteOffset;
                    newBufferView.byteLength = accessorByteOffset + accessorByteLength - currentByteOffset;
                    var newBufferViewId = addToArray(bufferViews, newBufferView);
                    for (j = currentIndex; j < i; ++j) {
                        accessor = accessors[j];
                        accessor.bufferView = newBufferViewId;
                        accessor.byteOffset = accessor.byteOffset - currentByteOffset;
                    }
                    currentByteStride = accessorByteStride;
                    currentByteOffset = accessorByteOffset;
                    currentIndex = i;
                }
            }
        }
    }

    // Delete old buffer views and build the buffer view shift map.
    var removeCount = 0;
    var bufferViewShiftMap = {};
    var bufferViewsLength = bufferViews.length;
    for (i = 0; i < bufferViewsLength; ++i) {
        bufferView = bufferViews[i];
        if (defined(bufferViewMap[i])) {
            ++removeCount;
            continue;
        }
        if (removeCount > 0) {
            var shiftIndex = i - removeCount;
            bufferViews[shiftIndex] = bufferView;
            bufferViewShiftMap[i] = shiftIndex;
        }
    }
    bufferViews.length -= removeCount;

    // Update bufferView property for all objects that reference buffer views
    ForEach.accessor(gltf, function(accessor) {
        var accessorBufferView = accessor.bufferView;
        if (defined(accessorBufferView)) {
            accessor.bufferView = bufferViewShiftMap[accessorBufferView];
        }
    });

    ForEach.shader(gltf, function(shader) {
        var shaderBufferView = shader.bufferView;
        if (defined(shaderBufferView)) {
            shader.bufferView = bufferViewShiftMap[shaderBufferView];
        }
    });

    ForEach.image(gltf, function(image) {
        var imageBufferView = image.bufferView;
        if (defined(imageBufferView)) {
            image.bufferView = bufferViewShiftMap[imageBufferView];
        }
        if (defined(image.extras)) {
            var compressedImages = image.extras.compressedImage3DTiles;
            for (var type in compressedImages) {
                if (compressedImages.hasOwnProperty(type)) {
                    var compressedImage = compressedImages[type];
                    var compressedImageBufferView = compressedImage.bufferView;
                    if (defined(compressedImageBufferView)) {
                        compressedImage.bufferView = bufferViewShiftMap[compressedImageBufferView];
                    }
                }
            }
        }
    });
}

function requireAccessorMinMax(gltf) {
    ForEach.accessor(gltf, function(accessor) {
        if (!defined(accessor.min) || !defined(accessor.max)) {
            var minMax = findAccessorMinMax(gltf, accessor);
            accessor.min = minMax.min;
            accessor.max = minMax.max;
        }
    });
}

function stripTechniqueAttributeValues(gltf) {
    ForEach.technique(gltf, function(technique) {
        ForEach.techniqueAttribute(technique, function(attribute) {
            var parameter = technique.parameters[attribute];
            if (defined(parameter.value)) {
                delete parameter.value;
            }
        });
    });
}

function stripTechniqueParameterCount(gltf) {
    ForEach.technique(gltf, function(technique) {
        ForEach.techniqueParameter(technique, function(parameter) {
            if (defined(parameter.count)) {
                var semantic = parameter.semantic;
                if (!defined(semantic) || (semantic !== 'JOINTMATRIX' && semantic.indexOf('_') !== 0)) {
                    delete parameter.count;
                }
            }
        });
    });
}

function addKHRTechniqueExtension(gltf) {
    var techniques = gltf.techniques;
    if (defined(techniques) && techniques.length > 0) {
        addExtensionsRequired(gltf, 'KHR_technique_webgl');
    }
}

function glTF10to20(gltf) {
    gltf.asset = defaultValue(gltf.asset, {});
    gltf.asset.version = '2.0';
    // material.instanceTechnique properties should be directly on the material. instanceTechnique is a gltf 0.8 property but is seen in some 1.0 models.
    updateInstanceTechniques(gltf);
    // animation.samplers now refers directly to accessors and animation.parameters should be removed
    removeAnimationSamplersIndirection(gltf);
    // top-level objects are now arrays referenced by index instead of id
    objectsToArrays(gltf);
    // asset.profile no longer exists
    stripAsset(gltf);
    // move known extensions from extensionsUsed to extensionsRequired
    requireKnownExtensions(gltf);
    // bufferView.byteLength and buffer.byteLength are required
    requireByteLength(gltf);
    // byteStride moved from accessor to bufferView
    moveByteStrideToBufferView(gltf);
    // accessor.min and accessor.max must be defined
    requireAccessorMinMax(gltf);
    // buffer.type is unnecessary and should be removed
    removeBufferType(gltf);
    // TEXCOORD and COLOR attributes must be written with a set index (TEXCOORD_#)
    requireAttributeSetIndex(gltf);
    // Add underscores to application-specific parameters
    underscoreApplicationSpecificSemantics(gltf);
    // remove scissor from techniques
    removeScissorFromTechniques(gltf);
    // clamp technique function states to min/max
    clampTechniqueFunctionStates(gltf);
    // clamp camera parameters
    clampCameraParameters(gltf);
    // a technique parameter specified as an attribute cannot have a value
    stripTechniqueAttributeValues(gltf);
    // only techniques with a JOINTMATRIX or application specific semantic may have a defined count property
    stripTechniqueParameterCount(gltf);
    // add KHR_technique_webgl extension
    addKHRTechniqueExtension(gltf);
}
