import {ChunkIndex} from "../data/chunkIndex";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";

export class CompactFaceBuffer {
    // Config properties
    public static readonly words_per_face = 6;
    public static readonly vap_config = {
        offset: 0,
        stride: 0,
        size: 1,
        count: 1
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

    // Face writing  TODO: Ensure consistent cull order, make more readable
    addFace(voxel: ChunkIndex, face: VoxelFace) {
        // >> Get axes operated on
        const axis = FaceUtils.getAxis(face);
        const ortho_axes = FaceUtils.getOrthoAxes(axis);

        // >> Get the root of the face
        const opposite_side = FaceUtils.getSign(face) === 1;
        const root_index = opposite_side ? ChunkIndex.add(voxel, axis, 1) : voxel;
        const is_root_outside = ChunkIndex.register_traversed_chunks !== 0;

        // >> Generate the face
        // Generate the root corner
        this.buffer[this.write_offset] = this.buffer[this.write_offset + 3] =
            this.encodePosIndex(root_index, is_root_outside);

        // Generate the "upward" corner.
        const pos_a_index = ChunkIndex.add(root_index, ortho_axes[0], 1);
        const is_pos_a_outside = is_root_outside || ChunkIndex.register_traversed_chunks !== 0;
        this.buffer[this.write_offset + (opposite_side ? 4 : 1)] = this.encodePosIndex(pos_a_index, is_pos_a_outside);

        // Generate the diagonal corner
        this.buffer[this.write_offset + 2] = this.buffer[this.write_offset + 5] =
            this.encodePosIndex(
                ChunkIndex.add(pos_a_index, ortho_axes[1], 1),
                is_pos_a_outside || ChunkIndex.register_traversed_chunks !== 0);

        // Generate the "rightward" corner
        this.buffer[this.write_offset + (opposite_side ? 1 : 4)] = this.encodePosIndex(
                ChunkIndex.add(root_index, ortho_axes[1], 1),
            is_root_outside || ChunkIndex.register_traversed_chunks !== 0);

        // >> Move the write offset
        this.write_offset += CompactFaceBuffer.words_per_face;
    }

    private encodePosIndex(pos: ChunkIndex, is_outside: boolean) {
        return pos + (is_outside ? 1 << ChunkIndex.bits_per_chunk_comp * 3 : 0);
    }
}