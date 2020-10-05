import {ChunkIndex} from "../data/chunkIndex";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {WritableArrayLike} from "../utils/vecUtils";

export type ShaderChunkIndex = number;
export const ShaderChunkIndex = new class {
    public readonly index_flag_bit_count = 3;
    public readonly index_flag_bit_mask = (2 ** this.index_flag_bit_count) - 1;

    fromChunkIndex(index: ChunkIndex): ShaderChunkIndex {
        return index << this.index_flag_bit_count;
    }

    toChunkIndex(index: ShaderChunkIndex): ChunkIndex {
        return index >> this.index_flag_bit_count;
    }

    getFlagBits(index: ShaderChunkIndex) {
        return index & this.index_flag_bit_mask;
    }

    addPositive(index: ShaderChunkIndex, axis: Axis) {
        const new_chunk_index = ChunkIndex.add(this.toChunkIndex(index), axis, 1);
        return this.fromChunkIndex(new_chunk_index) + this.getFlagBits(index)
            + (ChunkIndex.register_traversed_chunks !== 0 ? (1 << axis) : 0);  // Add bit flag for traversal.
    }
}();

export const CompactFaceEncoder = new class {
    // Config properties
    public static readonly words_per_face = 6;
    public static readonly vap_config = {
        size: 1,
        type: WebGLRenderingContext.UNSIGNED_SHORT,
        normalized: false
    } as const;

    // Shader generation methods
    genShaderParseFunc(name: string) {
        const { chunk_edge_length: edge_length } = ChunkIndex;
        return `vec3 ${name}(int vertex) {
    vec3 accumulator;
    accumulator.y += mod(vertex /= ${edge_length}, ${edge_length});
    accumulator.x += mod(vertex /= ${edge_length}, ${edge_length});
    accumulator.z += mod(vertex /= ${edge_length}, ${edge_length});

    if ((vertex /= 2) == 0) {
        accumulator.x = ${edge_length};
    }

    if ((vertex /= 2) == 0) {
        accumulator.y = ${edge_length};
    }

    if ((vertex /= 2) == 0) {
        accumulator.z = ${edge_length};
    }

    return accumulator;
}\n`;
    }

    // Face writing
    writeFace(buffer: WritableArrayLike<number>, root: number, stride: number, voxel: ChunkIndex, face: VoxelFace, ccw_culling: boolean = true) {
        // >> Get axes operated on
        const axis = FaceUtils.getAxis(face);
        const ortho_axes = FaceUtils.getOrthoAxes(axis);

        // >> Get the root of the face
        const is_opposite_side = FaceUtils.getSign(face) === 1
        let root_index = ShaderChunkIndex.fromChunkIndex(voxel);
        if (is_opposite_side) {
            root_index = ShaderChunkIndex.addPositive(root_index, axis);
        }

        // >> Generate the other vertices
        const vertex_a = ShaderChunkIndex.addPositive(root_index, ortho_axes[0]);
        const vertex_b = ShaderChunkIndex.addPositive(root_index, ortho_axes[1]);
        const vertex_diag = ShaderChunkIndex.addPositive(vertex_a, ortho_axes[1]);

        // >> Write the vertices to the buffer
        const flip_ab_vertices = ccw_culling === is_opposite_side;
        buffer[root] = buffer[root + 3 * stride] = root_index;
        buffer[root + 2 * stride] = buffer[root + 5 * stride] = vertex_diag;
        buffer[root + stride] = flip_ab_vertices ? vertex_b : vertex_a;
        buffer[root + 4 * stride] = flip_ab_vertices ? vertex_a : vertex_b;
    }
}();