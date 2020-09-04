import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {ChunkIndex, WorldSpaceUtils} from "./chunkIndex";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelWorld} from "./data";

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