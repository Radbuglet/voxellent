import {ChunkIndex} from "../data/math/chunkIndex";
import {VoxelFace} from "../data/math/face";
import {VoxelChunkWrapper} from "../data/voxelData";

export type VoxelMeshPartHandle = {};  // TODO
export type VoxelMeshDescriptor<TChunk> = { is_air: true } | {
    is_air: false,
    instance?: (chunk: TChunk, position: ChunkIndex, voxel: ArrayBuffer) => VoxelMeshPartHandle[],
    faces?: Record<VoxelFace, (chunk: TChunk, face_descriptor: any, voxel: ArrayBuffer) => VoxelMeshPartHandle[]>
};

export class VoxelChunkMesher {
    private readonly instances: any;
    private readonly faces: any;
    private readonly dirty_mesh_parts: any;

    voxelUpdated<TChunk extends VoxelChunkWrapper<TChunk>>(
            chunk: TChunk, describe_voxel: (voxel: ArrayBuffer) => VoxelMeshDescriptor<TChunk>, positions: IterableIterator<ChunkIndex>) {
        for (const position of positions) {
            const descriptor = describe_voxel(chunk.voxel_data.getVoxelRaw(position));
            if (descriptor.is_air) {
                // Remove all faces owned by this voxel
                // TODO

                // Reconstruct neighbors
                // TODO
            } else {
                // Removal all faces pointing into this voxel (reduce neighbors)
                // TODO

                // Construct own faces where neighbor is also air
                // TODO
            }
        }
    }

    chunkCleared() {
        // TODO
    }

    commitChanges() {
        // TODO
    }
}