import {FaceUtils, VoxelFace} from "./face";
import {vec3} from "gl-matrix";

export const BITS_PER_CHUNK_COMP = 4;
export const CHUNK_SIZE = 2 ** BITS_PER_CHUNK_COMP;

export type ChunkIndex = number;
export const ChunkIndex = {
    fromVector(x: number, y: number, z: number) {
        let index: ChunkIndex = 0;
        index += x;
        index += y << BITS_PER_CHUNK_COMP;
        index += z << 2 * BITS_PER_CHUNK_COMP;
        return index;
    },
    toVector(index: ChunkIndex, target: vec3 = vec3.create()) {
        target[0] = index & CHUNK_SIZE;
        index = index >> BITS_PER_CHUNK_COMP;
        target[1] = index & CHUNK_SIZE;
        index = index >> BITS_PER_CHUNK_COMP;
        target[2] = index & CHUNK_SIZE;
        return target;
    },
    getNeighbor(from_vec: ChunkIndex, face: VoxelFace) {
        const least_sig_bit = FaceUtils.getAxis(face) * BITS_PER_CHUNK_COMP;

        // Ensure that we will not go outside the chunk boundaries.
        const sign = FaceUtils.getSign(face);
        if (sign == -1 ?
                (from_vec & (CHUNK_SIZE << least_sig_bit)) <= 0 :  // If on the minimum value and subtracting
                (from_vec & (CHUNK_SIZE << least_sig_bit)) >= CHUNK_SIZE) {  // If on the minimum value and adding
            return -1;
        }

        // Otherwise, perform the addition.
        return from_vec + (1 << least_sig_bit) * sign;
    }
};