import {FaceUtils, VoxelFace} from "./math/face";
import {vec3} from "gl-matrix";
import {getVectorKey, isIntVec, VectorKey} from "./math/math";
import {CHUNK_SIZE, ChunkIndex} from "./math/chunkIndex";

// TODO: Traversal utilities, ray casts and rigid bodies
export class VoxelWorld<TWrapped = never> {
    private readonly chunks = new Map<VectorKey, VoxelChunk<TWrapped>>();

    // Chunk management
    addChunk(pos: vec3, wrapped_instance: TWrapped, voxel_byte_size: number): VoxelChunk<TWrapped> {
        console.assert(!this.chunks.has(getVectorKey(pos)) && isIntVec(pos));

        const instance = new VoxelChunk(wrapped_instance, voxel_byte_size);
        this.chunks.set(getVectorKey(pos), instance);

        // Link with neighbors
        for (const face of FaceUtils.getFaces()) {
            // Find neighbor position
            const axis = FaceUtils.getAxis(face);
            const sign = FaceUtils.getSign(face);
            pos[axis] += sign;

            // Find neighbor and link
            const neighbor = this.chunks.get(getVectorKey(pos));
            if (neighbor != null)
                instance.linkToNeighbor(face, neighbor);

            // Revert position vector to original state
            pos[axis] -= sign;
        }

        return instance;
    }

    removeChunk(pos: vec3) {
        return this.chunks.delete(getVectorKey(pos));
    }

    getChunk(pos: vec3) {
        return this.chunks.get(getVectorKey(pos));
    }

    // Voxel lookups
    static decodePosition(ws: vec3): { outer: vec3, inner: ChunkIndex } {
        throw "Not implemented";
    }

    getVoxel(pos: vec3): VoxelPointer<TWrapped> {
        throw "Not implemented";
    }
}

export class VoxelChunk<TWrapped = never> {
    private readonly neighbors: (VoxelChunk<TWrapped> | undefined)[] = new Array(6);
    private readonly data: ArrayBuffer;

    constructor(public readonly parent: TWrapped, private readonly voxel_byte_size: number) {
        this.data = new ArrayBuffer(voxel_byte_size * CHUNK_SIZE ** 3);
    }

    // Neighbor management
    linkToNeighbor(face: VoxelFace, other: VoxelChunk<TWrapped>) {
        this.neighbors[face] = other;
        other.neighbors[FaceUtils.getInverse(face)] = this;
    }

    getNeighbor(face: VoxelFace) {
        return this.neighbors[face];
    }

    // Voxel lookups
    getVoxel(pos: vec3): VoxelPointer<TWrapped> {
        throw "Not implemented";
    }

    // Raw voxel management
    getVoxelRaw(pos: ChunkIndex): ArrayBuffer {
        return this.data.slice(pos * this.voxel_byte_size, this.voxel_byte_size);
    }
}

export class VoxelPointer<TWrapped = never> {
    constructor(public outer_pos: vec3, public inner_pos: ChunkIndex, public chunk?: VoxelChunk<TWrapped>) {}

    attemptReattach() {
        throw "Not implemented";
    }

    getData(): ArrayBuffer {
        throw "Not implemented";
    }

    getNeighbor(face: VoxelFace, jump_size: number) {
        throw "Not implemented";
    }

    setWorldPos(pos: vec3) {
        throw "Not implemented";
    }

    clone(): VoxelPointer<TWrapped> {
        throw "Not implemented";
    }

    copyTo(target: VoxelPointer<TWrapped>) {
        throw "Not implemented";
    }
}