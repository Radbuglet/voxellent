import {FaceUtils, VoxelFace} from "./face";

const BITS_PER_COMP = 4;
export const CHUNK_SIZE = 2 ** BITS_PER_COMP;

export type ChunkIndex = number;
export const ChunkIndex = {
    getNeighbor(from_vec: ChunkIndex, face: VoxelFace) {
        const least_sig_bit = FaceUtils.getAxis(face) * BITS_PER_COMP;

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