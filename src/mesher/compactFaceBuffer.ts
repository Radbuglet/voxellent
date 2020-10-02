import {ChunkIndex} from "../data/chunkIndex";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";

type ShaderChunkIndex = number;
const ShaderChunkIndex = new class {
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

export class CompactFaceBuffer {
    // Config properties
    public static readonly words_per_face = 6;
    public static readonly vap_config = {
        size: 1,
        type: WebGLRenderingContext.UNSIGNED_SHORT,
        normalized: false,
        stride: 0,
        offset: 0
    } as const;

    // Shader generation methods
    public static genShaderParseFunc(name: string): string {
        throw "Not implemented";  // TODO
    }

    // Write stream properties
    public buffer!: Uint16Array;
    private write_offset = 0;

    // Constructor
    constructor(face_count: number) {
        this.resize(face_count);
    }

    // Buffer management
    resize(face_count: number) {
        this.buffer = new Uint16Array(face_count * CompactFaceBuffer.words_per_face);
    }

    clear() {
        this.write_offset = 0;
    }

    // Face writing
    addFace(voxel: ChunkIndex, face: VoxelFace, ccw_culling: boolean = true) {  // TODO: Check vertex cull ordering logic
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
        this.buffer[this.write_offset] = this.buffer[this.write_offset + 3] = root_index;
        this.buffer[this.write_offset + 2] = this.buffer[this.write_offset + 5] = vertex_diag;
        this.buffer[this.write_offset + 1] = flip_ab_vertices ? vertex_b : vertex_a;
        this.buffer[this.write_offset + 4] = flip_ab_vertices ? vertex_a : vertex_b;

        // >> Move the write offset
        this.write_offset += CompactFaceBuffer.words_per_face;
    }
}