import {VoxelFace, Axis, FaceUtils} from "../data/face";
import {P$} from "ts-providers";
import {VoxelChunk} from "../data/voxelData";
import {ChunkIndex} from "../data/chunkIndex";

// Mesh infrastructure
export interface MesherBaseContext<TCtx extends MesherBaseContext<TCtx>> {
    readonly meshing_queue: WorldMeshingQueue<TCtx>
}

export class WorldMeshingQueue<TCtx extends MesherBaseContext<TCtx>> {
    private readonly meshers = new Set<ChunkMesher<TCtx>>();

    addChunk(mesher: ChunkMesher<TCtx>) {
        this.meshers.add(mesher);
    }

    updateChunks(ctx: TCtx) {
        for (const mesher of this.meshers) {
            mesher.updateChunk(ctx);
        }
        this.meshers.clear();
    }
}

// Meshing instance
type ContainerBase<TCtx extends MesherBaseContext<TCtx>> = P$<typeof VoxelChunk, VoxelChunk<ContainerBase<TCtx>>> &
    P$<typeof ChunkMesher, ChunkMesher<TCtx>>;

export abstract class ChunkMesher<TCtx extends MesherBaseContext<TCtx>> {
    public static readonly type = Symbol();

    protected constructor(private readonly chunk: ContainerBase<TCtx>) {}

    protected flagDirtyVoxelNeighbor(ctx: TCtx, location: ChunkIndex, face: VoxelFace) {
        if (ChunkIndex.addFace(location, face).traversed_chunks > 1) {
            this.flagDirtyChunkNeighbor(ctx, face);
        }
    }

    protected flagDirtyVoxelNeighbors(ctx: TCtx, location: ChunkIndex) {
        for (const axis of FaceUtils.getAxes()) {
            const face = ChunkIndex.getEdgeFace(location, axis);
            if (face != null) {
                this.flagDirtyChunkNeighbor(ctx, face);
            }
        }
    }

    protected flagDirtyChunkNeighbor(ctx: TCtx, face: VoxelFace) {
        const neighbor = this.chunk[VoxelChunk.type].getNeighbor(face);
        if (neighbor != null)
            ctx.meshing_queue.addChunk(neighbor[ChunkMesher.type]);
    }

    public abstract updateVoxel(ctx: TCtx, location: ChunkIndex): void;

    public abstract updateChunk(ctx: TCtx): void;

    public abstract free(ctx: TCtx): void;
}