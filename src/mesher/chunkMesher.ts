import {ChunkIndex} from "../data/chunkIndex";
import {GlCtx, RecordKey} from "../utils/aliases";

export interface RenderingDefinition<TChunk, TLayers extends Record<string, ChunkMeshLayer> = {}> {
    readonly layer_factories: { [K in keyof TLayers]: (gl: GlCtx) => TLayers[K] };
    renderChunk(chunk: TChunk, getLayer: <T extends keyof TLayers>(key: T, weak?: boolean) => TLayers[T]): void;
}

export interface ChunkMeshLayer {
    render(gl: GlCtx): void;
    free(gl: GlCtx): void;
}

export class ChunkMesher<TChunk> {
    public static type = Symbol();
    private readonly layers = new Map<RecordKey, ChunkMeshLayer>();

    constructor(private readonly renderer: RenderingDefinition<TChunk>) {}

    makeDirty(index: ChunkIndex) {

    }

    uploadBuffers(gl: GlCtx) {

    }

    render(gl: GlCtx) {
        
    }

    free(gl: GlCtx) {
        for (const layer of this.layers.values()) {
            layer.free(gl);
        }
    }
}