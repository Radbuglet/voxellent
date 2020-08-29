import {VoxelFace, FaceUtils} from "../utils/faceUtils";
import {P$} from "ts-providers";
import {VoxelChunk} from "../data/voxelData";
import {ChunkIndex} from "../data/chunkIndex";

type DirtyChunk<TCtx> = UpdatableChunkMesh<TCtx> & P$<typeof VoxelChunk, VoxelChunk<DirtyChunk<TCtx>>>;

export interface UpdatableChunkMesh<TCtx> {
    updateChunk(ctx: TCtx): void;
}

export class ChunkMeshingQueue<TCtx> {
    private readonly dirty = new Set<DirtyChunk<TCtx>>();

    flagChunk(chunk: DirtyChunk<TCtx>) {
        this.dirty.add(chunk);
    }

    flagChunkNeighbor(chunk: DirtyChunk<TCtx>, face: VoxelFace) {
        const neighbor = chunk[VoxelChunk.type].getNeighbor(face);
        if (neighbor != null)
            this.flagChunk(neighbor);
    }

    flagVoxelFace(chunk: DirtyChunk<TCtx>, index: ChunkIndex, face: VoxelFace) {
        if (ChunkIndex.addFace(index, face).traversed_chunks > 1) {
            this.flagChunkNeighbor(chunk, face);
        } else {
            this.flagChunk(chunk);
        }
    }

    flagVoxelFaces(chunk: DirtyChunk<TCtx>, index: ChunkIndex) {
        let flagged_self = false;
        for (const axis of FaceUtils.getAxes()) {
            const face = ChunkIndex.getEdgeFace(index, axis);
            if (face != null) {
                this.flagChunkNeighbor(chunk, face);
            } else if (!flagged_self) {
                this.flagChunk(chunk);
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