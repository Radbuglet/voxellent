import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {ChunkIndex, WorldSpaceUtils} from "./chunkIndex";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelChunkStatus, VoxelWorld} from "./worldStore";
import {VecUtils} from "../utils/vecUtils";

const default_max_chunk_traversal = 32;

export interface ReadonlyVoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    readonly outer_pos: Readonly<vec3>;
    readonly inner_pos: ChunkIndex;
    hasChunkCache(): boolean;
    getChunk(world: VoxelWorld<TChunk>): TChunk | undefined;
    getWorldPos(target?: vec3): vec3;
    getChunkPos(): Readonly<vec3>;
    moveByChunkCopy(chunk_delta: Readonly<vec3>, max_cache_traversal?: number): VoxelPointer<TChunk>;
    getNeighborCopy(face: VoxelFace, magnitude?: number, max_cache_traversal?: number): VoxelPointer<TChunk>;
    moveByCopy(delta: Readonly<vec3>, max_cache_traversal?: number): VoxelPointer<TChunk>;
    clone(): VoxelPointer<TChunk>;
    copyTo(target: VoxelPointer<TChunk>): void;
}

export class VoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> implements ReadonlyVoxelPointer<TChunk> {
    // Properties
    constructor(private readonly _outer_pos = vec3.create(), public inner_pos: ChunkIndex = 0, private chunk_cache?: TChunk) {}

    static empty<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>() {
        return new VoxelPointer<TChunk>();
    }

    static fromPair<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(outer_pos: Readonly<vec3>, inner_pos: ChunkIndex) {
        return new VoxelPointer(vec3.clone(outer_pos as vec3), inner_pos);
    }

    static fromPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(pos: Readonly<vec3>) {
        const instance = new VoxelPointer<TChunk>();
        instance.setWorldPos(pos);
        return instance;
    }

    static fromPosAttached<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(world: VoxelWorld<TChunk>, pos: Readonly<vec3>) {
        const instance = new VoxelPointer<TChunk>();
        instance.setWorldPos(pos);
        instance.forceRefreshChunkCache(world);  // We know that the chunk cache won't be valid.
        return instance;
    }

    static fromChunkPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(chunk: TChunk, index: ChunkIndex) {
        const instance = new VoxelPointer<TChunk>();
        instance.setPosInChunk(chunk, index);
        return instance;
    }

    // Chunk reference management
    hasChunkCache() {
        return this.chunk_cache != null && this.chunk_cache[VoxelChunk.type].status === VoxelChunkStatus.InWorld;
    }

    clearChunkCache() {
        this.chunk_cache = undefined;
    }

    forceRefreshChunkCache(world: VoxelWorld<TChunk>): boolean {
        this.chunk_cache = world.getChunk(this._outer_pos);
        return this.chunk_cache != null;
    }

    refreshChunkCache(world: VoxelWorld<TChunk>): boolean {
        return this.hasChunkCache() || this.forceRefreshChunkCache(world);
    }

    getChunk(world: VoxelWorld<TChunk>): TChunk | undefined {
        this.refreshChunkCache(world);
        return this.chunk_cache;
    }

    private ensureValidChunkCache() {
        if (this.chunk_cache != null && this.chunk_cache[VoxelChunk.type].status !== VoxelChunkStatus.InWorld) {
            this.chunk_cache = undefined;
        }
    }

    // Position management
    getWorldPos(target: vec3 = vec3.create()): vec3 {
        return ChunkIndex.addToVector(this.inner_pos,
            WorldSpaceUtils.chunkOuterGetWsRoot(this._outer_pos, target));
    }

    setWorldPos(pos: Readonly<vec3>) {
        WorldSpaceUtils.wsGetChunkOuter(pos, this._outer_pos);
        this.inner_pos = WorldSpaceUtils.wsGetChunkIndex(pos);
        this.chunk_cache = undefined;
    }

    setWorldPosRegional(pos: Readonly<vec3>, max_cache_traversal?: number) {
        // Find movement delta
        this.getWorldPos(VecUtils.work_vec);
        vec3.sub(VecUtils.work_vec, pos as vec3, VecUtils.work_vec);

        // Move by the delta
        this.moveByMut(VecUtils.work_vec, max_cache_traversal);
    }

    setPosRelativeTo(pointer: VoxelPointer<TChunk>, delta: Readonly<vec3>, max_cache_traversal?: number) {
        pointer.copyTo(this);
        this.moveByMut(delta, max_cache_traversal);
    }

    setPosInChunk(chunk: TChunk, index: ChunkIndex) {
        vec3.copy(this._outer_pos, chunk[VoxelChunk.type].outer_pos);
        this.inner_pos = index;
        this.chunk_cache = chunk;
    }

    get outer_pos(): Readonly<vec3> {
        return this._outer_pos;
    }

    set outer_pos(pos: Readonly<vec3>) {
        vec3.copy(this._outer_pos, pos as vec3);
        this.chunk_cache = undefined;
    }

    getChunkPos(): Readonly<vec3> {
        return this._outer_pos;
    }

    setChunkPosRegional(pos: Readonly<vec3>, max_chunk_traversal?: number) {
        this.moveByChunkMut(vec3.sub(VecUtils.work_vec, pos as vec3, this._outer_pos), max_chunk_traversal);
    }

    // Chunk relative movement
    moveByChunkMut(chunk_delta: Readonly<vec3>, max_cache_traversal: number = default_max_chunk_traversal) {
        // Update context-less position
        vec3.add(this._outer_pos, this._outer_pos, chunk_delta as vec3);

        // Update chunk cache
        for (const axis of FaceUtils.getAxes()) {
            if (this.chunk_cache == null) return this;

            let allowed_axis_traversal = max_cache_traversal;  // Uses per axis traversal limits for consistency.
            const traversal_face = FaceUtils.fromParts(axis, FaceUtils.signOf(chunk_delta[axis]));

            for (let i = 0; this.chunk_cache != null && i < Math.abs(chunk_delta[axis]); i++) {
                if (--allowed_axis_traversal <= 0) {
                    this.chunk_cache = undefined;
                    return this;
                }

                this.chunk_cache = this.chunk_cache[VoxelChunk.type].getNeighbor(traversal_face);
            }
        }
        return this;
    }

    moveByChunkCopy(chunk_delta: Readonly<vec3>, max_cache_traversal?: number) {
        return this.clone().moveByChunkMut(chunk_delta, max_cache_traversal);
    }

    // Neighbor querying
    getNeighborMut(face: VoxelFace, magnitude: number = 1, max_cache_traversal: number = default_max_chunk_traversal) {
        const axis = FaceUtils.getAxis(face);
        const sign = FaceUtils.getSign(face);
        const index = ChunkIndex.add(this.inner_pos, axis, sign * magnitude);
        let traversed_chunks = ChunkIndex.register_traversed_chunks;

        // Update context-less position
        this.inner_pos = index;
        this._outer_pos[axis] += traversed_chunks * sign;

        // Update chunk cache
        if (traversed_chunks > 0) {
            this.ensureValidChunkCache();
            while (this.chunk_cache != null && traversed_chunks > 0) {
                if (--max_cache_traversal <= 0) {
                    this.chunk_cache = undefined;
                    break;
                }
                this.chunk_cache = this.chunk_cache[VoxelChunk.type].getNeighbor(face);
            }
        }

        return this;
    }

    getNeighborCopy(face: VoxelFace, magnitude?: number, max_cache_traversal?: number) {
        return this.clone().getNeighborMut(face, magnitude, max_cache_traversal);
    }

    // Relative movement
    moveByMut(delta: Readonly<vec3>, max_cache_traversal?: number) {
        // Move the pointer to the target position using neighbor traversals.
        for (const axis of FaceUtils.getAxes()) {
            this.getNeighborMut(FaceUtils.fromParts(axis, FaceUtils.signOf(delta[axis])), Math.abs(delta[axis]), max_cache_traversal);
        }

        return this;
    }

    moveByCopy(delta: Readonly<vec3>, max_cache_traversal?: number) {
        return this.clone().moveByMut(delta, max_cache_traversal);
    }

    // Memory management
    clone() {
        return new VoxelPointer<TChunk>(vec3.clone(this._outer_pos), this.inner_pos, this.chunk_cache);
    }

    copyTo(target: VoxelPointer<TChunk>) {
        vec3.copy(target._outer_pos, this._outer_pos);
        target.inner_pos = this.inner_pos;
        target.chunk_cache = this.chunk_cache;
    }
}