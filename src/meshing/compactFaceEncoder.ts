import {ChunkIndex} from "../data/chunkIndex";
import {Axis} from "../utils/faceUtils";
import {FaceVertexManipulator} from "./coreVertexGeneration";

export type ShaderChunkIndex = number;
export const ShaderChunkIndex = new class implements FaceVertexManipulator<ShaderChunkIndex> {
    public readonly index_flag_bit_count = 3;
    public readonly index_flag_bit_mask = (2 ** this.index_flag_bit_count) - 1;
    public readonly vap_config = {
        size: 2,
        type: WebGLRenderingContext.UNSIGNED_SHORT,
        normalized: false
    } as const;

    // Encoding
    fromChunkIndex(index: ChunkIndex): ShaderChunkIndex {
        return index << this.index_flag_bit_count;
    }

    toChunkIndex(index: ShaderChunkIndex): ChunkIndex {
        return index >> this.index_flag_bit_count;
    }

    getFlagBits(index: ShaderChunkIndex) {
        return index & this.index_flag_bit_mask;
    }

    addPositive(index: ShaderChunkIndex, axis: Axis, magnitude: number) {
        console.assert(magnitude === 1);
        const new_chunk_index = ChunkIndex.add(this.toChunkIndex(index), axis, 1);
        return this.fromChunkIndex(new_chunk_index) + this.getFlagBits(index)
            + (ChunkIndex.register_traversed_chunks !== 0 ? (1 << axis) : 0);  // Add bit flag for traversal.
    }

    // Decoding
    genShaderParseFunc(name: string) {
        const { chunk_edge_length: edge_length } = ChunkIndex;
        return `
vec3 ${name}(int vertex) {
    vec3 accumulator;
    accumulator.y += mod(vertex /= ${edge_length}, ${edge_length});
    accumulator.x += mod(vertex /= ${edge_length}, ${edge_length});
    accumulator.z += mod(vertex /= ${edge_length}, ${edge_length});

    if ((vertex /= 2) == 0)
        accumulator.x = ${edge_length};

    if ((vertex /= 2) == 0)
        accumulator.y = ${edge_length};

    if ((vertex /= 2) == 0)
        accumulator.z = ${edge_length};

    return accumulator;
}\n`;
    }
}();