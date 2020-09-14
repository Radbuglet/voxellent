# Voxel Engine Rewritten

This engine-agnostic library aims to provide the abstractions necessary for building Minecraft-like voxel games in the browser. The voxel data module provides an efficient data structure for tightly storing grid based voxel data. The voxel meshing module allows users to parse the materials however they see fit while providing meshing layer classes built for raw WebGL to reduce the amount of boilerplate for most projects. Unlike other attempts at a browser based voxel engine, this engine is not tied to a single rendering framework and the data and rendering logic are very loosely coupled.

Voxel engine rewritten is a cleaner and more flexible revision of my old [voxel-engine](https://github.com/Radbuglet/voxel-engine) project. Here is a list of the major differences:

- No actual rendering code is in the core modules. The library is now engine-agnostic.
- Chunk meshing now supports multiple layers.
- Meshing can be custom.
- Many complex effects such as transparency, subdivided blocks and block meshes are now supported by the system.
- `GpuSetBuffers` are no longer used by default because of the large size of their CPU buffer mirror at the expense of very minor bandwidth gains.
- The utilities for loading in textures are gone as it is not the job of the library to handle WebGL boilerplate.
- Utilities from the Lyptic fork of the previous engine have been ported to this engine, notably:
    - Voxel based raytracing
    - Voxel based `MovableBodies`

Planned features:

- Interactive chunk loading
- A block registry
- A customizable compressed voxel mesh buffer

## Managing voxel world data

TODO

## Using voxel physics

TODO

## Rendering voxel worlds

TODO

## API reference

TODO