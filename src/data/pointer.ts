import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {ChunkIndex, WorldSpaceUtils} from "./chunkIndex";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelWorld} from "./data";
import {Sign} from "../utils/vecUtils";

export class VoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    // Construction
    constructor(public outer_pos: vec3 = vec3.create(), public inner_pos: ChunkIndex = 0, public chunk_cache?: TChunk) {}

    static fromPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(world: VoxelWorld<TChunk>, pos: Readonly<vec3>) {
        const instance = new VoxelPointer<TChunk>();
        instance.setWorldPosRefreshed(world, pos);
        return instance;
    }

    static fromChunkPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(chunk: TChunk, index: ChunkIndex) {
        const instance = new VoxelPointer<TChunk>();
        instance.setPosInChunk(chunk, index);
        instance.chunk_cache = chunk;
        return instance;
    }

    // Chunk reference management
    refreshChunk(world: VoxelWorld<TChunk>): boolean {
        this.chunk_cache = world.getChunk(this.outer_pos);
        return this.chunk_cache != null;
    }

    attemptReattach(world: VoxelWorld<TChunk>): boolean {
        return this.chunk_cache != null || this.refreshChunk(world);
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
        this.refreshChunk(world);
    }

    setWorldPosDetach(pos: Readonly<vec3>) {
        this._setWorldPosNoReattach(pos);
        this.chunk_cache = undefined;
    }

    setWorldPosRegional(world: VoxelWorld<TChunk>, pos: Readonly<vec3>) {  // TODO: Use the relative movement algorithm
        if (this.chunk_cache == null) {
            this.setWorldPosRefreshed(world, pos);
            return;
        }

        // Store the old position of the chunk
        const old_cx = this.outer_pos[0];
        const old_cy = this.outer_pos[1];
        const old_cz = this.outer_pos[2];

        // Move the position state
        this._setWorldPosNoReattach(pos);

        // See if we traversed to a neighbor
        for (const axis of FaceUtils.getAxes()) {
            // Get chunk delta (done in this weird way to avoid a heap allocation)
            let chunk_delta = this.outer_pos[axis];
            if (axis === 0) {
                chunk_delta -= old_cx;
            } else if (axis === 1) {
                chunk_delta -= old_cy;
            } else {
                chunk_delta -= old_cz;
            }

            // Traverse.
            if (chunk_delta === 0) {
                // Nothing to do on this axis.
            } else if (chunk_delta === 1 || chunk_delta === -1) {
                // Traverse to the already captured chunk's neighbor.
                this.chunk_cache = this.chunk_cache![VoxelChunk.type].getNeighbor(FaceUtils.fromParts(axis, chunk_delta as Sign));
            } else {
                // Nothing we can do here. Fallback to a refresh.
                this.refreshChunk(world);
                return;
            }
        }
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

            if (this.chunk_cache != null && world != null) {
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