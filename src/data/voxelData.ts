import {vec3} from "gl-matrix";
import {P$} from "ts-providers";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VectorKey, VecUtils} from "../utils/vecUtils";
import {CHUNK_EDGE_SIZE, ChunkIndex, WorldSpaceUtils} from "./chunkIndex";

export class VoxelWorld<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public static readonly type = Symbol();
    private readonly chunks = new Map<VectorKey, TChunk>();

    // Chunk management
    addChunk(pos: vec3, instance: TChunk) {
        console.assert(!this.chunks.has(VecUtils.getVectorKey(pos)) && VecUtils.isIntVec(pos));
        this.chunks.set(VecUtils.getVectorKey(pos), instance);
        instance[VoxelChunk.type].outer_pos = pos;

        // Link with neighbors
        for (const face of FaceUtils.getFaces()) {
            // Find neighbor position
            const axis = FaceUtils.getAxis(face);
            const sign = FaceUtils.getSign(face);
            pos[axis] += sign;

            // Find neighbor and link
            const neighbor = this.chunks.get(VecUtils.getVectorKey(pos));
            if (neighbor != null)
                instance[VoxelChunk.type].linkToNeighbor(face, instance, neighbor);

            // Revert position vector to original state
            pos[axis] -= sign;
        }
    }

    removeChunk(pos: vec3) {
        return this.chunks.delete(VecUtils.getVectorKey(pos));
    }

    getChunk(pos: vec3) {
        return this.chunks.get(VecUtils.getVectorKey(pos));
    }
}

export class VoxelChunk<TNeighbor extends P$<typeof VoxelChunk, VoxelChunk<TNeighbor>>> {
    public static readonly type = Symbol();

    private readonly neighbors: (TNeighbor | undefined)[] = new Array(6);
    private data?: ArrayBuffer;
    public outer_pos = vec3.create();

    constructor(private bytes_per_voxel: number) {}

    // Neighbor management
    linkToNeighbor(face: VoxelFace, self: TNeighbor, other: TNeighbor) {
        this.neighbors[face] = other;
        other[VoxelChunk.type].neighbors[FaceUtils.getInverse(face)] = self;
    }

    getNeighbor(face: VoxelFace) {
        return this.neighbors[face];
    }

    // Voxel management
    allocateVoxelData(bytes_per_voxel?: number) {
        if (bytes_per_voxel != null) this.bytes_per_voxel = bytes_per_voxel;
        this.data = new ArrayBuffer(this.bytes_per_voxel * CHUNK_EDGE_SIZE ** 3);
    }

    hasVoxelData() {
        return this.data != null;
    }

    removeVoxelData() {
        this.data = undefined;
    }

    getVoxelRaw(pos: ChunkIndex): ArrayBuffer | null {
        return this.data == null ? null : this.data.slice(pos * this.bytes_per_voxel, this.bytes_per_voxel);
    }

    getVoxelRawOrCreate(pos: ChunkIndex): ArrayBuffer {
        if (this.data == null) {
            this.allocateVoxelData();
        }
        return this.data!.slice(pos * this.bytes_per_voxel, this.bytes_per_voxel);
    }
}

export class VoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    // Construction
    constructor(public outer_pos: vec3 = vec3.create(), public inner_pos: ChunkIndex = 0, public chunk?: TChunk) {}

    static fromPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(world: VoxelWorld<TChunk>, pos: vec3) {
        const instance = new VoxelPointer<TChunk>();
        instance.setWorldPos(world, pos);
        return instance;
    }

    static fromChunkPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(chunk: TChunk, index: ChunkIndex) {
        const instance = new VoxelPointer<TChunk>();
        instance.setPosInChunk(chunk, index);
        return instance;
    }

    // Chunk reference management
    refreshChunk(world: VoxelWorld<TChunk>): boolean {
        this.chunk = world.getChunk(this.outer_pos);
        return this.chunk != null;
    }

    attemptReattach(world: VoxelWorld<TChunk>): boolean {
        return this.chunk != null || this.refreshChunk(world);
    }

    // Position management
    getWorldPos(target: vec3 = vec3.create()): vec3 {
        return ChunkIndex.addToVector(this.inner_pos,
            WorldSpaceUtils.chunkOuterGetWsRoot(this.outer_pos, target));
    }

    setWorldPos(world: VoxelWorld<TChunk>, pos: vec3) {
        this.setWorldPosNoReattach(pos);
        this.refreshChunk(world);
    }

    setWorldPosNoReattach(pos: vec3) {
        WorldSpaceUtils.wsGetChunkOuter(pos, this.outer_pos);
        this.inner_pos = WorldSpaceUtils.wsGetChunkIndex(pos);
    }

    setPosInChunk(chunk: TChunk, index: ChunkIndex) {
        vec3.copy(this.outer_pos, chunk[VoxelChunk.type].outer_pos);
        this.inner_pos = index;
        this.chunk = chunk;
    }

    // Neighbor querying
    getNeighborRaw(face: VoxelFace, target: VoxelPointer<TChunk> = this, reattach_using_world?: VoxelWorld<TChunk>): VoxelPointer<TChunk> {
        const axis = FaceUtils.getAxis(face);
        const sign = FaceUtils.getSign(face);
        const { index, traversed_chunks } = ChunkIndex.add(this.inner_pos, axis, sign);

        if (traversed_chunks > 0) {
            if (this.chunk != null) {
                target.chunk = this.chunk[VoxelChunk.type].getNeighbor(face);
            } else if (reattach_using_world != null) {
                this.attemptReattach(reattach_using_world);
            }
            target.outer_pos[axis] += sign;
        }
        target.inner_pos = index;
        return target;
    }

    getNeighbor(world: VoxelWorld<TChunk>, face: VoxelFace, target: VoxelPointer<TChunk> = this): VoxelPointer<TChunk> {
        this.getNeighborRaw(face, target, world);
        return target;
    }

    // Memory management
    clone() {
        return new VoxelPointer<TChunk>(vec3.clone(this.outer_pos), this.inner_pos, this.chunk);
    }

    copyTo(target: VoxelPointer<TChunk>) {
        vec3.copy(target.outer_pos, this.outer_pos);
        target.inner_pos = this.inner_pos;
        target.chunk = this.chunk;
    }
}