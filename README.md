# Voxellent

An engine-agnostic library for handling cubic voxel worlds.

Voxellent provides data structures for creating and interacting with infinitely sized cubic worlds and generating optimized meshes to render them. Voxellent makes no assumptions about the underlying rendering technology, and the world voxel data structures are completely decoupled from the meshing subsystem.

## Features

Data submodule:

- `ChunkContainer` and `LinkableChunk`: a data structure for storing an infinitely large grid of chunks.
- `VoxelPointer`: an object allowing efficient traversal of the chunk grid.
- `VoxelRayCast`: an object allowing efficient and customizable ray tracing of the voxel world.
- `VoxelMovableBody`: an object allowing reliable and efficient AABB collision checking against the voxel world.
- `ChunkLoader`: an object providing efficient rectangular chunk visibility updates.
- `ChunkDataStore`: a data structure for efficiently storing voxel materials in a chunk.

Meshing submodule:

- `ChunkMeshingQueue`: a manager object for keeping track of chunks in need of a re-meshing.
- `ChunkMeshing`: a collection of functions providing a highly customizable system for generating optimized chunk meshes.
- `CoreVertexGeneration`: a collection of functions enabling users to easily generate vertices in a representation-agnostic fashion.
- `CompactFaceEncoder`: a compression helper to reduce the size of the mesh in VRAM.  

## Usage

Voxellent is available through the NPM package registry and can be installed using `npm install voxellent --save`. This package already contains TypeScript type declaration files—there is no need to install them separately.

You can access the project's documentation [here]() (TODO). 

## Testing

TODO

## Contributing

TODO

## License

[MIT](LICENSE)