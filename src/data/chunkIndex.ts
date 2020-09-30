import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {vec3} from "gl-matrix";

export type ChunkIndex = number;
export const ChunkIndex = new class {
    public readonly bits_per_chunk_comp = 4;
    public readonly chunk_edge_size = 2 ** this.bits_per_chunk_comp;
    public readonly chunk_voxel_count = this.chunk_edge_size ** 3;

    public register_traversed_chunks = 0;

    // Vector-index interactions
    fromWorldVector(vec: Readonly<vec3>) {
        return this.fromChunkPosition(vec[0] & this.chunk_edge_size, vec[1] & this.chunk_edge_size, vec[2] & this.chunk_edge_size);
    }

    fromChunkPosition(x: number, y: number, z: number) {
        return x + (y << this.bits_per_chunk_comp) + (z << 2 * this.bits_per_chunk_comp);
    }

    fromChunkPosVector(vec: Readonly<vec3>) {
        return this.fromChunkPosition(vec[0], vec[1], vec[2]);
    }

    addToVector(index: ChunkIndex, target: vec3 = vec3.create()) {
        target[0] += index & this.chunk_edge_size;
        index = index >> this.bits_per_chunk_comp;
        target[1] += index & this.chunk_edge_size;
        index = index >> this.bits_per_chunk_comp;
        target[2] += index & this.chunk_edge_size;
        return target;
    }

    // Axis modification
    add(index: ChunkIndex, axis: Axis, delta: number) {
        const axis_value = this.getComponent(index, axis) + delta;
        this.register_traversed_chunks = axis_value >> this.bits_per_chunk_comp;
        return index - index & (this.chunk_edge_size << this.bits_per_chunk_comp * axis_value)  // Removes previous component value
            + axis_value & this.chunk_edge_size;  // Adds the wrapped component value
    }

    addFace(index: ChunkIndex, face: VoxelFace, delta: number = 1) {
        return this.add(index, FaceUtils.getAxis(face), FaceUtils.getSign(face) * delta);
    }

    // Seeking
    getComponent(index: ChunkIndex, axis: Axis) {
        return (index >> axis * this.bits_per_chunk_comp) & this.chunk_edge_size;
    }

    getChunkEdgeFace(index: ChunkIndex, axis: Axis): VoxelFace | null {
        const comp  = this.getComponent(index, axis);
        if (comp === 0) {
            return FaceUtils.fromParts(axis, -1);
        } else if (comp === this.chunk_edge_size - 1) {
            return FaceUtils.fromParts(axis, 1);
        } else {
            return null;
        }
    }

    *iterateAllIndices(): IterableIterator<ChunkIndex> {
        for (let i = 0; i < this.chunk_voxel_count; i++) {
            yield i;
        }
    }
}();

export const WorldSpaceUtils = new class {
    wsGetChunkOuter(vec: Readonly<vec3>, target: vec3 = vec3.create()) {
        target[0] = vec[0] >> ChunkIndex.bits_per_chunk_comp;
        target[1] = vec[1] >> ChunkIndex.bits_per_chunk_comp;
        target[2] = vec[2] >> ChunkIndex.bits_per_chunk_comp;
        return target;
    }

    chunkOuterGetWsRoot(vec: Readonly<vec3>, target: vec3 = vec3.create()) {
        target[0] = vec[0] << ChunkIndex.bits_per_chunk_comp;
        target[1] = vec[1] << ChunkIndex.bits_per_chunk_comp;
        target[2] = vec[2] << ChunkIndex.bits_per_chunk_comp;
        return target;
    }

    wsGetChunkInner(vec: Readonly<vec3>, target: vec3 = vec3.create()) {
        target[0] = vec[0] & ChunkIndex.chunk_edge_size;
        target[1] = vec[1] & ChunkIndex.chunk_edge_size;
        target[2] = vec[2] & ChunkIndex.chunk_edge_size;
        return target;
    }

    wsGetChunkIndex(vec: Readonly<vec3>) {
        return ChunkIndex.fromChunkPosition(
            vec[0] & ChunkIndex.chunk_edge_size,
            vec[1] & ChunkIndex.chunk_edge_size,
            vec[2] & ChunkIndex.chunk_edge_size);
    }
}();