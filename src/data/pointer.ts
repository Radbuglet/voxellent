import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {ChunkIndex, WorldSpaceUtils} from "./chunkIndex";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelWorld} from "./data";

export class VoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    private static readonly work_vec = vec3.create();

    // Construction
    private constructor(public outer_pos = vec3.create(), public inner_pos: ChunkIndex = 0, public chunk_cache?: TChunk) {}

    static empty<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>() {
        return new VoxelPointer<TChunk>();
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
        return this.chunk_cache != null && this.chunk_cache[VoxelChunk.type].in_world;
    }

    forceRefreshChunkCache(world: VoxelWorld<TChunk>): boolean {
        this.chunk_cache = world.getChunk(this.outer_pos);
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
        if (this.chunk_cache != null && !this.chunk_cache[VoxelChunk.type].in_world) {
            this.chunk_cache = undefined;
        }
    }

    // Position management
    getWorldPos(target: vec3 = vec3.create()): vec3 {
        return ChunkIndex.addToVector(this.inner_pos,
            WorldSpaceUtils.chunkOuterGetWsRoot(this.outer_pos, target));
    }

    _setWorldPosNoReattach(pos: Readonly<vec3>) {
        WorldSpaceUtils.wsGetChunkOuter(pos, this.outer_pos);
        this.inner_pos = WorldSpaceUtils.wsGetChunkIndex(pos);
    }

    setWorldPos(pos: Readonly<vec3>) {
        this._setWorldPosNoReattach(pos);
        this.chunk_cache = undefined;
    }

    setWorldPosRegional(pos: Readonly<vec3>) {
        // Find movement delta
        this.getWorldPos(VoxelPointer.work_vec);
        vec3.sub(VoxelPointer.work_vec, pos as vec3, VoxelPointer.work_vec);

        // Move by the delta
        this.moveByMut(VoxelPointer.work_vec);
    }

    setPosInChunk(chunk: TChunk, index: ChunkIndex) {
        vec3.copy(this.outer_pos, chunk[VoxelChunk.type].outer_pos);
        this.inner_pos = index;
        this.chunk_cache = chunk;
    }

    // Neighbor querying
    getNeighborMut(face: VoxelFace, magnitude: number = 1) {
        const axis = FaceUtils.getAxis(face);
        const sign = FaceUtils.getSign(face);
        let { index, traversed_chunks } = ChunkIndex.add(this.inner_pos, axis, sign * magnitude);

        // Update context-less position
        this.inner_pos = index;
        this.outer_pos[axis] += traversed_chunks * sign;

        // Update chunk cache
        if (traversed_chunks > 0) {
            this.ensureValidChunkCache();
            while (this.chunk_cache != null && traversed_chunks > 0) {
                this.chunk_cache = this.chunk_cache[VoxelChunk.type].getNeighbor(face);
            }
        }

        return this;
    }

    getNeighborCopy(face: VoxelFace, magnitude?: number) {
        return this.clone().getNeighborMut(face, magnitude);
    }

    // Relative movement
    moveByMut(delta: Readonly<vec3>) {
        // Move the pointer to the target position using neighbor traversals.
        for (const axis of FaceUtils.getAxes()) {
            this.getNeighborMut(FaceUtils.fromParts(axis, FaceUtils.signOf(delta[axis])), Math.abs(delta[axis]));
        }
    }

    moveByCopy(delta: Readonly<vec3>) {
        return this.clone().moveByMut(delta);
    }

    // Memory management
    clone() {
        return new VoxelPointer<TChunk>(vec3.clone(this.outer_pos), this.inner_pos, this.chunk_cache);
    }

    copyTo(target: VoxelPointer<TChunk>) {
        vec3.copy(target.outer_pos, this.outer_pos);
        target.inner_pos = this.inner_pos;
        target.chunk_cache = this.chunk_cache;
    }
}