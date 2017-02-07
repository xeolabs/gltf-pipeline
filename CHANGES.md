Change Log
==========

### 0.1.0-alpha10 - 2017-02-07
* Added `compressTextures` stage to compress input textures to a variety of compressed texture formats. [#204](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/204)
* Optimized `mergeBuffers` to avoid repeated copies, drastically improving performance when there are lots of buffers to merge. [#218](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/218)
* Fixed a bug in `addPipelineExtras` that made it try to add extras to null objects. [#219](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/219)
* Expose `triangleAxisAlignedBoundingBoxOverlap`, an implementation of Tomas Akenine-Möller algorithm for determining if a triangle overlaps an axis aligned bounding box. [#221](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/221)
* Merged [gltf-statistics](https://github.com/AnalyticalGraphicsInc/gltf-statistics) as a stage in the pipeline. [#220](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/220)
* Added `updateVersion` stage for patching glTF `0.8` -> `1.0` changes; `addDefaults` no longer calls `processModelMaterialsCommon`. [#223](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/223)
* Added `build-cesium-combined` command to gulp file for generating simple files for other projects. [#231](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/231)
* Changed Cesium `Geometry` and `VertexFormat` `binormal` attribute to `bitangent`. [#211](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/211)
* Added `tangentsBitangents` generation option. [#203](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/203)

### 0.1.0-alpha9 - 2017-01-03
* Fixed issue with embedding base64 encoded shader strings for assets using the KHR_materials_common extension. [#197](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/197)

### 0.1.0-alpha8 - 2016-12-13
* Fixed issue with embedding base64 encoded shader strings inside the glTF. [#194](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/194)
* Added `-p` flag for preserving the glTF hierarchy. Optimization stages are not run when this flag is enabled. [#200](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/200)

### 0.1.0-alpha7 - 2016-12-08
* `modelMaterialsCommon` renamed to `processModelMaterialsCommon`. [#185](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/185)
* Added `generateModelMaterialsCommon` and command line `kmc` flags for generating models with the `KHR_materials_common` extension. [#185](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/185)

### 0.1.0-alpha6 - 2016-11-18

* Fixed `combinePrimitives` stage and re-added it to the pipeline. [#108](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/issues/108)
* Expose parsing argument arrays into an options object via `parseArguments`. [#183](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/183)

### 0.1.0-alpha5 - 2016-11-02

* Added `MergeDuplicateProperties` for stages merging duplicate glTF properties, like materials and shaders. [#152](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/152)
  * `mergeDuplicateAccessors` is now a part of this stage.
  * `RemoveUnusedProperties` stage names are changed from `removeUnusedXXX` to `removeXXX`. `MergeDuplicateProperties` conforms to this naming convention.
* `quantizedAttributes` has an optional `normalized` flag to use the glTF 1.0.1 `accessor.normalized` for a higher precision decode matrix. [#165](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/165)
* Fixed an issue where pipeline extras are not removed when running `Pipeline.processJSON` and `Pipeline.processFile`. [#180](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/180)
* Added support for generating hard normals with the `-f` flag and for removing normals with `-r`. [#173](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/173)
* Preserve non-default shader attributes when generating shaders. [#175](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/175)
* The `_3DTILESDIFFUSE` semantic is added to the model's technique when `optimizeForCesium` is true. [#174](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/174)

### 0.1.0-alpha4 - 2016-08-25

* `cacheOptimization` no longer crashes on primitives without indices. [#154](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/issues/154)
* Public API is exposed via `index.js` [#153](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/issues/153)
  * Documentation has been added for all exposed functions.
  * `OptimizationStats` is removed from `removeUnused` stages.
  * `gltfPipeline.js` is now named `Pipeline.js`.
  * `bakeAmbientOcclusion.js` now directly exports the `bakeAmbientOcclusion` function.
  * `bakeAmbientOcclusion` now takes a glTF asset as its first parameter to match the function signature of other stages.
  * All `removeUnused` stages have been consolidated to `RemoveUnusedProperties` to clean up the global scope.
  * `readBufferComponentType` and `writeBufferComponentType` have been renamed to `readBufferComponent` and `writeBufferComponent` respectively.

### 0.1.0-alpha3 - 2016-07-25

* Converted the API to now use promises instead of callbacks. [#135](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/135)

### 0.1.0-alpha2 - 2016-07-21

* Fixed an issue causing some compressed accessors to not render. [#148](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/148)
* Fixed a quantization rounding issue. [#147](https://github.com/AnalyticalGraphicsInc/gltf-pipeline/pull/147)

### 0.1.0-alpha1 - 2016-07-20

* Initial release.
