# Voxel Engine Rewritten

This engine aims to provide the abstractions necessary for building Minecraft-like voxel games in the browser. Voxel engine rewritten is a cleaner and more flexible revision of my old [voxel-engine](https://github.com/Radbuglet/voxel-engine) project. Here is a list of the major differences:

- Chunk meshing now supports multiple layers.
- Meshing can be custom.
- Many complex effects such as transparency, subdivided blocks and block meshes are now supported by the system.
- `GpuSetBuffers` are no longer used by default because of the large size of their CPU buffer mirror at the expense of very minor bandwidth gains.
- The utilities for loading in textures are gone as it is not the job of the library to handle WebGl boilerplate.
- Utilities from the Lyptic fork of the previous engine have been included in this engine, notably:
    - Voxel based raytracing
    - Voxel based rigidBodies

## Managing voxel world data

TODO

## Rendering voxel worlds

TODO

## API reference

TODO