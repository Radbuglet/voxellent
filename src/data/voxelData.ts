import {FaceUtils, VoxelFace} from "./math/face";
import {vec3} from "gl-matrix";
import {getVectorKey, isIntVec, VectorKey} from "./math/math";
import {BITS_PER_CHUNK_COMP, CHUNK_SIZE, ChunkIndex} from "./math/chunkIndex";

// TODO: Traversal utilities, ray casts and rigid bodies
type UntypedVoxelChunkWrapper = VoxelChunkWrapper;
export interface VoxelChunkWrapper<TWrapper extends VoxelChunkWrapper<TWrapper> = UntypedVoxelChunkWrapper> {
    readonly voxel_data: VoxelChunk<TWrapper>
}

export class VoxelWorld<TChunkWrapper extends VoxelChunkWrapper<TChunkWrapper> = VoxelChunkWrapper> {
    private readonly chunks = new Map<VectorKey, TChunkWrapper>();

    // Chunk management
    addChunk(pos: vec3, instance: TChunkWrapper) {
        console.assert(!this.chunks.has(getVectorKey(pos)) && isIntVec(pos));
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
                instance.voxel_data.linkToNeighbor(face, instance, neighbor);

            // Revert position vector to original state
            pos[axis] -= sign;
        }
    }

    removeChunk(pos: vec3) {
        return this.chunks.delete(getVectorKey(pos));
    }

    getChunk(pos: vec3) {
        return this.chunks.get(getVectorKey(pos));
    }

    // Voxel lookups
    static decodePosition(ws: vec3, target_vec_outer = vec3.create()): { outer: vec3, inner: ChunkIndex } {
        const inner = ChunkIndex.fromVector(ws[0] & CHUNK_SIZE, ws[1] & CHUNK_SIZE, ws[2] & CHUNK_SIZE);
        target_vec_outer[0] = ws[0] >> BITS_PER_CHUNK_COMP;
        target_vec_outer[1] = ws[1] >> BITS_PER_CHUNK_COMP;
        target_vec_outer[2] = ws[2] >> BITS_PER_CHUNK_COMP;
        return { inner, outer: target_vec_outer };
    }

    getVoxel(pos: vec3, target: VoxelPointer<TChunkWrapper> = new VoxelPointer<TChunkWrapper>()): VoxelPointer<TChunkWrapper> {
        const { inner } = VoxelWorld.decodePosition(pos, target.outer_pos);
        target.inner_pos = inner;
        target.chunk = this.getChunk(target.outer_pos);
        return target;
    }
}

export class VoxelChunk<TChunkWrapper extends VoxelChunkWrapper<TChunkWrapper> = VoxelChunkWrapper> {
    private readonly neighbors: (TChunkWrapper | undefined)[] = new Array(6);
    private readonly data: ArrayBuffer;

    constructor(private readonly voxel_byte_size: number) {
        this.data = new ArrayBuffer(voxel_byte_size * CHUNK_SIZE ** 3);
    }

    // Neighbor management
    linkToNeighbor(face: VoxelFace, self: TChunkWrapper, other: TChunkWrapper) {
        this.neighbors[face] = other;
        other.voxel_data.neighbors[FaceUtils.getInverse(face)] = self;
    }

    getNeighbor(face: VoxelFace) {
        return this.neighbors[face];
    }

    // Raw voxel management
    getVoxelRaw(pos: ChunkIndex): ArrayBuffer {
        return this.data.slice(pos * this.voxel_byte_size, this.voxel_byte_size);
    }
}

export class VoxelPointer<TChunkWrapper extends VoxelChunkWrapper<TChunkWrapper> = VoxelChunkWrapper> {
    constructor(public outer_pos: vec3 = vec3.create(), public inner_pos: ChunkIndex = 0, public chunk?: TChunkWrapper) {}

    attemptReattach(world: VoxelWorld<TChunkWrapper>): boolean {
        this.chunk = world.getChunk(this.outer_pos);
        return this.chunk != null;
    }

    getData() {
        return this.chunk == null ? null : this.chunk.voxel_data.getVoxelRaw(this.inner_pos);
    }

    getNeighbor(world: VoxelWorld<TChunkWrapper>, face: VoxelFace, jump_size: number) {
        const { index, traversed_chunks } = ChunkIndex.add(this.inner_pos, FaceUtils.getAxis(face), FaceUtils.getSign(face) * jump_size);
        this.inner_pos = index;
        for (let i = 0; i < traversed_chunks && this.chunk != null; i++) {
            this.chunk = this.chunk.voxel_data.getNeighbor(face);
        }
        if (this.chunk == null) {
            this.attemptReattach(world);
        }
    }

    getWorldPos(world: VoxelWorld<TChunkWrapper>, target: vec3 = vec3.create()): vec3 {
        target[0] = this.outer_pos[0] << BITS_PER_CHUNK_COMP;
        target[1] = this.outer_pos[1] << BITS_PER_CHUNK_COMP;
        target[2] = this.outer_pos[2] << BITS_PER_CHUNK_COMP;
        this.attemptReattach(world);
        return ChunkIndex.addToVector(this.inner_pos, target);
    }

    setWorldPos(world: VoxelWorld<TChunkWrapper>, pos: vec3) {
        throw "Not implemented";
    }

    clone() {
        return new VoxelPointer<TChunkWrapper>(this.outer_pos, this.inner_pos, this.chunk);
    }

    copyTo(target: VoxelPointer<TChunkWrapper>) {
        target.outer_pos = this.outer_pos;
        target.inner_pos = this.inner_pos;
        target.chunk = this.chunk;
    }
}