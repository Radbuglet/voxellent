import {VoxelChunk, VoxelPointer} from "../data/voxelData";
import {P$} from "ts-providers";
import {ChunkIndex} from "../data/chunkIndex";
import {FaceUtils, VoxelFace} from "../data/face";
import {Rect2} from "../utils/rect2";

export type CraftVoxelMesh<TCtx, TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> = {
    [_ in VoxelFace]: { rect: Rect2, generateMesh: (ctx: TCtx, location: VoxelPointer<TChunk>, face: VoxelFace) => void }
} & {
    generateInstance?: (ctx: TCtx, location: VoxelPointer<TChunk>) => void
};

// TODO: Optimize for in-chunk face pairs
export function createCraftChunkMesh<TCtx, TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(
        ctx: TCtx, chunk: TChunk, decodeVoxel: (pointer: VoxelPointer<TChunk>) => CraftVoxelMesh<TCtx, TChunk> | null) {
    const pointer_target = new VoxelPointer<TChunk>();
    const pointer_lookup = new VoxelPointer<TChunk>();

    for (const index of ChunkIndex.iterateAllIndices()) {
        // Parse voxel
        pointer_target.setPosInChunk(chunk, index);
        const own_mesh = decodeVoxel(pointer_target);
        if (own_mesh == null)
            continue;

        // Create faces
        for (const face of FaceUtils.getFaces()) {
            // Parse neighbor
            pointer_target.getNeighborDirect(face, pointer_lookup);
            const neighbor_mesh = decodeVoxel(pointer_target);

            // Determine whether or not our face should exist
            if (neighbor_mesh == null) {
                // TODO
            }

            // Generate the face!
            own_mesh[face].generateMesh(ctx, pointer_target, face);
        }

        // Create instance mesh
        if (own_mesh.generateInstance != null)
            own_mesh.generateInstance(ctx, pointer_target);
    }
}