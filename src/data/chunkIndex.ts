import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {vec3} from "gl-matrix";

export const BITS_PER_CHUNK_COMP = 4;
export const CHUNK_EDGE_SIZE = 2 ** BITS_PER_CHUNK_COMP;
export const CHUNK_VOXEL_COUNT = CHUNK_EDGE_SIZE ** 3;

export type ChunkIndex = number;
export const ChunkIndex = new (class {
    // Vector-index interactions
    fromWorldVector(vec: vec3) {
        return this.fromChunkVector(vec[0] & CHUNK_EDGE_SIZE, vec[1] & CHUNK_EDGE_SIZE, vec[2] & CHUNK_EDGE_SIZE);
    }

    fromChunkVector(x: number, y: number, z: number) {
        return x + (y << BITS_PER_CHUNK_COMP) + (z << 2 * BITS_PER_CHUNK_COMP);
    }

    addToVector(index: ChunkIndex, target: vec3 = vec3.create()) {
        target[0] += index & CHUNK_EDGE_SIZE;
        index = index >> BITS_PER_CHUNK_COMP;
        target[1] += index & CHUNK_EDGE_SIZE;
        index = index >> BITS_PER_CHUNK_COMP;
        target[2] += index & CHUNK_EDGE_SIZE;
        return target;
    }

    // Axis modification
    add(index: ChunkIndex, axis: Axis, delta: number) {
        const axis_value = this.getComponent(index, axis) + delta;
        return {
            traversed_chunks: axis_value >> BITS_PER_CHUNK_COMP,
            index: index - index & (CHUNK_EDGE_SIZE << BITS_PER_CHUNK_COMP * axis_value)  // Removes previous component value
                + axis_value & CHUNK_EDGE_SIZE  // Adds the new wrapped component value
        };
    }

    addFace(index: ChunkIndex, face: VoxelFace, delta: number = 1) {
        return this.add(index, FaceUtils.getAxis(face), FaceUtils.getSign(face) * delta);
    }

    // Seeking
    getComponent(index: ChunkIndex, axis: Axis) {
        return (index >> axis * BITS_PER_CHUNK_COMP) & CHUNK_EDGE_SIZE;
    }

    getEdgeFace(index: ChunkIndex, axis: Axis): VoxelFace | null {
        const comp  = this.getComponent(index, axis);
        if (comp === 0) {
            return FaceUtils.fromParts(axis, -1);
        } else if (comp === CHUNK_EDGE_SIZE - 1) {
            return FaceUtils.fromParts(axis, 1);
        } else {
            return null;
        }
    }

    *iterateAllIndices(): IterableIterator<ChunkIndex> {
        for (let i = 0; i < CHUNK_VOXEL_COUNT; i++) {
            yield i;
        }
    }
})();

export const WorldSpaceUtils = new (class {
    wsGetChunkOuter(vec: vec3, target: vec3 = vec3.create()) {
        target[0] = vec[0] >> BITS_PER_CHUNK_COMP;
        target[1] = vec[1] >> BITS_PER_CHUNK_COMP;
        target[2] = vec[2] >> BITS_PER_CHUNK_COMP;
        return target;
    }

    chunkOuterGetWsRoot(vec: vec3, target: vec3 = vec3.create()) {
        target[0] = vec[0] << BITS_PER_CHUNK_COMP;
        target[1] = vec[1] << BITS_PER_CHUNK_COMP;
        target[2] = vec[2] << BITS_PER_CHUNK_COMP;
        return target;
    }

    wsGetChunkInner(vec: vec3, target: vec3 = vec3.create()) {
        target[0] = vec[0] & CHUNK_EDGE_SIZE;
        target[1] = vec[1] & CHUNK_EDGE_SIZE;
        target[2] = vec[2] & CHUNK_EDGE_SIZE;
        return target;
    }

    wsGetChunkIndex(vec: vec3) {
        return ChunkIndex.fromChunkVector(
            vec[0] & CHUNK_EDGE_SIZE,
            vec[1] & CHUNK_EDGE_SIZE,
            vec[2] & CHUNK_EDGE_SIZE);
    }
})();