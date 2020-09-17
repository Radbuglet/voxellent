import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {ChunkIndex, WorldSpaceUtils} from "./chunkIndex";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelWorld} from "./data";

// FIXME: Make chunks store a reference to the world. Invalidate the chunk cache if the chunk is out of the world.
export class VoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    private static readonly work_vec = vec3.create();

    // Construction
    constructor(public outer_pos: vec3 = vec3.create(), public inner_pos: ChunkIndex = 0, public chunk_cache?: TChunk) {}

    static fromPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(pos: Readonly<vec3>) {
        const instance = new VoxelPointer<TChunk>();
        instance.setWorldPosDetach(pos);
        return instance;
    }

    static fromPosAttached<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(world: VoxelWorld<TChunk>, pos: Readonly<vec3>) {
        const instance = new VoxelPointer<TChunk>();
        instance.setWorldPosRefreshed(world, pos);
        return instance;
    }

    static fromChunkPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(chunk: TChunk, index: ChunkIndex) {
        const instance = new VoxelPointer<TChunk>();
        instance.setPosInChunk(chunk, index);
        return instance;
    }

    // Chunk reference management
    refreshChunkCache(world: VoxelWorld<TChunk>): boolean {
        this.chunk_cache = world.getChunk(this.outer_pos);
        return this.chunk_cache != null;
    }

    attemptReattach(world: VoxelWorld<TChunk>): boolean {
        return this.chunk_cache != null || this.refreshChunkCache(world);
    }

    getChunk(world: VoxelWorld<TChunk>): TChunk | undefined {
        this.attemptReattach(world);
        return this.chunk_cache;
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

    setWorldPosRefreshed(world: VoxelWorld<TChunk>, pos: Readonly<vec3>) {
        this._setWorldPosNoReattach(pos);
        this.refreshChunkCache(world);
    }

    setWorldPosDetach(pos: Readonly<vec3>) {
        this._setWorldPosNoReattach(pos);
        this.chunk_cache = undefined;
    }

    setWorldPosRegional(world: VoxelWorld<TChunk>, pos: Readonly<vec3>) {
        if (this.chunk_cache == null) {
            this.setWorldPosRefreshed(world, pos);
            return;
        }

        // Find movement delta
        this.getWorldPos(VoxelPointer.work_vec);
        vec3.sub(VoxelPointer.work_vec, pos as vec3, VoxelPointer.work_vec);

        // Move by the delta
        this.moveByMut(VoxelPointer.work_vec, world);
    }

    setPosInChunk(chunk: TChunk, index: ChunkIndex) {
        vec3.copy(this.outer_pos, chunk[VoxelChunk.type].outer_pos);
        this.inner_pos = index;
        this.chunk_cache = chunk;
    }

    // Neighbor querying
    getNeighborMut(face: VoxelFace, world: VoxelWorld<TChunk> | null, magnitude: number = 1) {
        const axis = FaceUtils.getAxis(face);
        const sign = FaceUtils.getSign(face);
        let { index, traversed_chunks } = ChunkIndex.add(this.inner_pos, axis, sign * magnitude);

        // Update context-less position
        this.inner_pos = index;
        this.outer_pos[axis] += traversed_chunks * sign;

        // Trace target chunk
        if (traversed_chunks > 0) {
            while (this.chunk_cache != null && traversed_chunks > 0) {
                this.chunk_cache = this.chunk_cache[VoxelChunk.type].getNeighbor(face);

                // If we managed to trace directly to the neighbor, no need to reattach even if the pointer is detached.
                if (--traversed_chunks === 0) {
                    return this;
                }
            }

            // If we have a world to reattach to, we should attempt to reattach if we lost the target chunk along the way.
            if (world != null) {
                this.attemptReattach(world);
            }
        }

        return this;
    }

    getNeighborCopy(face: VoxelFace, world: VoxelWorld<TChunk> | null, magnitude?: number) {
        return this.clone().getNeighborMut(face, world, magnitude);
    }

    // Relative movement
    moveByMut(delta: Readonly<vec3>, world: VoxelWorld<TChunk> | null) {
        // Move the pointer to the target position using neighbor traversals.
        for (const axis of FaceUtils.getAxes()) {
            this.getNeighborMut(FaceUtils.fromParts(axis, FaceUtils.signOf(delta[axis])), null, Math.abs(delta[axis]));
        }

        // If any of them loose the chunk, we can reattach if the world was provided.
        if (world !== null) {
            this.attemptReattach(world);
        }
    }

    moveByCopy(delta: Readonly<vec3>, world: VoxelWorld<TChunk> | null) {
        return this.clone().moveByMut(delta, world);
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