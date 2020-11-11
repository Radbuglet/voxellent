import {ChunkIndex} from "../data/chunkIndex";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {Rect2} from "../utils/rect2";
import {VoxelPointer} from "../data/pointer";
import {LinkableChunk} from "../data/worldStore";

export type VoxelMeshDescriptor<TCtx, TUserChunk> = {
    [_ in VoxelFace]: null | { rect: Rect2, generateMesh: (ctx: TCtx, location: VoxelPointer<TUserChunk>, face: VoxelFace) => void }
} & {
    generateInstance?: (ctx: TCtx, location: VoxelPointer<TUserChunk>) => void
};

export const ChunkMeshing = new class {
    generateMesh<TCtx, TUserChunk>(
        ctx: TCtx, chunk: LinkableChunk<TUserChunk>, decodeVoxel: (pointer: VoxelPointer<TUserChunk>) => VoxelMeshDescriptor<TCtx, TUserChunk> | null) {
        const pointer_target = VoxelPointer.empty<TUserChunk>();

        for (const index of ChunkIndex.iterateAllIndices()) {
            // Parse voxel
            pointer_target.setPosInChunk(chunk, index);
            const own_mesh = decodeVoxel(pointer_target);
            if (own_mesh == null)
                continue;

            // Create faces
            for (const face of FaceUtils.getFaces()) {
                const own_mesh_face = own_mesh[face];
                if (own_mesh_face == null) continue;

                // Parse neighbor
                pointer_target.getNeighborMut(face);
                const neighbor_mesh = decodeVoxel(pointer_target);

                // Determine whether or not our face should exist
                if (neighbor_mesh != null) {
                    const neighbor_occ_face = neighbor_mesh[FaceUtils.getInverse(face)];
                    if (neighbor_occ_face != null && Rect2.containsRect(neighbor_occ_face.rect, own_mesh_face.rect)) {
                        continue;  // We can't be visible making this a redundant face.
                    }
                }

                // Generate the face!
                own_mesh_face.generateMesh(ctx, pointer_target, face);
            }

            // Create instance mesh
            if (own_mesh.generateInstance != null)
                own_mesh.generateInstance(ctx, pointer_target);
        }
    }
}();