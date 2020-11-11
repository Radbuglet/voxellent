import {VoxelFace, FaceUtils} from "../utils/faceUtils";
import {LinkableChunk} from "../data/worldStore";
import {ChunkIndex} from "../data/chunkIndex";

type DirtyChunk<TCtx> = LinkableChunk<UpdatableChunkMesh<TCtx>>;

export interface UpdatableChunkMesh<TCtx> {
    updateChunk(ctx: TCtx): void;
}

export class ChunkMeshingQueue<TCtx> {
    private readonly dirty = new Set<UpdatableChunkMesh<TCtx>>();

    flagChunk(instance: UpdatableChunkMesh<TCtx>) {
        this.dirty.add(instance);
    }

    flagChunkNeighbor(chunk: DirtyChunk<TCtx>, face: VoxelFace) {
        const neighbor = chunk.getNeighbor(face);
        if (neighbor != null)
            this.flagChunk(neighbor.user_data);
    }

    flagVoxelFace(chunk: DirtyChunk<TCtx>, index: ChunkIndex, face: VoxelFace) {
        // Ignore the position result (we only care about the chunk traversal count)
        ChunkIndex.addFace(index, face);

        // If we traversed any chunks to get to that voxel, flag them as dirty.
        if (ChunkIndex.register_traversed_chunks > 1) {
            this.flagChunkNeighbor(chunk, face);
        } else {
            this.flagChunk(chunk.user_data);
        }
    }

    flagVoxelFaces(chunk: DirtyChunk<TCtx>, index: ChunkIndex) {
        let flagged_self = false;
        for (const axis of FaceUtils.getAxes()) {
            const face = ChunkIndex.getChunkEdgeFace(index, axis);
            if (face != null) {
                this.flagChunkNeighbor(chunk, face);
            } else if (!flagged_self) {
                this.flagChunk(chunk.user_data);
                flagged_self = true;
            }
        }
    }

    updateChunks(ctx: TCtx) {
        for (const mesher of this.dirty) {
            mesher.updateChunk(ctx);
        }
        this.dirty.clear();
    }
}