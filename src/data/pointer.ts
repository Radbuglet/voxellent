import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {ChunkIndex, WorldSpaceUtils} from "./chunkIndex";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelWorld} from "./data";
import {Sign} from "../utils/vecUtils";

export class VoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    // Construction
    constructor(public outer_pos: vec3 = vec3.create(), public inner_pos: ChunkIndex = 0, public chunk_cache?: TChunk) {}

    static fromPos<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(world: VoxelWorld<TChunk>, pos: vec3) {
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

    _setWorldPosNoReattach(pos: vec3) {
        WorldSpaceUtils.wsGetChunkOuter(pos, this.outer_pos);
        this.inner_pos = WorldSpaceUtils.wsGetChunkIndex(pos);
    }

    setWorldPosRefreshed(world: VoxelWorld<TChunk>, pos: vec3) {
        this._setWorldPosNoReattach(pos);
        this.refreshChunk(world);
    }

    setWorldPosDetach(pos: vec3) {
        this._setWorldPosNoReattach(pos);
        this.chunk_cache = undefined;
    }

    setWorldPosRegional(world: VoxelWorld<TChunk>, pos: vec3) {
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
    getNeighborRaw(face: VoxelFace, target: VoxelPointer<TChunk> = new VoxelPointer<TChunk>(), reattach_using_world?: VoxelWorld<TChunk>): VoxelPointer<TChunk> {
        const axis = FaceUtils.getAxis(face);
        const sign = FaceUtils.getSign(face);
        const { index, traversed_chunks } = ChunkIndex.add(this.inner_pos, axis, sign);

        // TODO: The target's state is not updated properly.
        if (traversed_chunks > 0) {
            if (this.chunk_cache != null) {
                target.chunk_cache = this.chunk_cache[VoxelChunk.type].getNeighbor(face);
            } else if (reattach_using_world != null) {
                this.attemptReattach(reattach_using_world);
            }
            target.outer_pos[axis] += sign;
        }
        target.inner_pos = index;
        return target;
    }

    getNeighbor(world: VoxelWorld<TChunk>, face: VoxelFace, target: VoxelPointer<TChunk> = new VoxelPointer<TChunk>()): VoxelPointer<TChunk> {
        return this.getNeighborRaw(face, target, world);
    }

    // Relative movement
    moveByRaw(rel: vec3, target: VoxelPointer<TChunk> = new VoxelPointer<TChunk>(), reattach_using_world?: VoxelWorld<TChunk>) {
        throw "Not implemented";  // TODO
    }

    moveBy(world: VoxelWorld<TChunk>, rel: vec3, target: VoxelPointer<TChunk> = new VoxelPointer<TChunk>()) {
        this.moveByRaw(rel, target, world);
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