import {VoxelFace} from "../data/face";
import {P$} from "ts-providers";
import {VoxelChunk} from "../data/voxelData";

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

    protected abstract handleUpdateDirect(ctx: TCtx): void;
    protected abstract handleUpdateBatch(ctx: TCtx): void;
    protected abstract free(ctx: TCtx): void;

    protected constructor(private readonly chunk: ContainerBase<TCtx>) {}

    protected flagDirtyNeighbor(ctx: TCtx, face: VoxelFace) {
        const neighbor = this.chunk[VoxelChunk.type].getNeighbor(face);
        if (neighbor != null)
            ctx.meshing_queue.addChunk(neighbor[ChunkMesher.type]);
    }

    updateVoxel(ctx: TCtx) {
        throw "Not implemented";
    }

    updateChunk(ctx: TCtx) {
        throw "Not implemented";
    }
}