import {vec3} from "gl-matrix";
import {P$} from "ts-providers";
import {FaceUtils, VoxelFace} from "./face";
import {getVectorKey, isIntVec, VectorKey} from "../utils/math";
import {BITS_PER_CHUNK_COMP, CHUNK_SIZE, ChunkIndex} from "./chunkIndex";

export class VoxelWorld<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public static readonly type = Symbol();
    private readonly chunks = new Map<VectorKey, TChunk>();

    // Chunk management
    addChunk(pos: vec3, instance: TChunk) {
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
                instance[VoxelChunk.type].linkToNeighbor(face, instance, neighbor);

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
    getVoxel(pos: vec3, target = new VoxelPointer<TChunk>()): VoxelPointer<TChunk> {
        target.setWorldPos(this, pos);
        return target;
    }
}

export class VoxelChunk<TNeighbor extends P$<typeof VoxelChunk, VoxelChunk<TNeighbor>>> {
    public static readonly type = Symbol();

    private readonly neighbors: (TNeighbor | undefined)[] = new Array(6);
    private readonly data: ArrayBuffer;

    constructor(private readonly bytes_per_voxel: number) {
        this.data = new ArrayBuffer(bytes_per_voxel * CHUNK_SIZE ** 3);
    }

    // Neighbor management
    linkToNeighbor(face: VoxelFace, self: TNeighbor, other: TNeighbor) {
        this.neighbors[face] = other;
        other[VoxelChunk.type].neighbors[FaceUtils.getInverse(face)] = self;
    }

    getNeighbor(face: VoxelFace) {
        return this.neighbors[face];
    }

    // Raw voxel management
    getVoxelRaw(pos: ChunkIndex): ArrayBuffer {
        return this.data.slice(pos * this.bytes_per_voxel, this.bytes_per_voxel);
    }
}

export class VoxelPointer<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    constructor(public outer_pos: vec3 = vec3.create(), public inner_pos: ChunkIndex = 0, public chunk?: TChunk) {}

    attemptReattach(world: VoxelWorld<TChunk>): boolean {
        this.chunk = world.getChunk(this.outer_pos);
        return this.chunk != null;
    }

    getNeighbor(world: VoxelWorld<TChunk>, face: VoxelFace, jump_size: number) {
        const { index, traversed_chunks } = ChunkIndex.addFace(this.inner_pos, face, jump_size);
        this.inner_pos = index;
        for (let i = 0; i < traversed_chunks && this.chunk != null; i++) {
            this.chunk = this.chunk[VoxelChunk.type].getNeighbor(face);
        }
        if (this.chunk == null) {
            this.attemptReattach(world);
        }
    }

    getWorldPos(world: VoxelWorld<TChunk>, target: vec3 = vec3.create()): vec3 {
        target[0] = this.outer_pos[0] << BITS_PER_CHUNK_COMP;
        target[1] = this.outer_pos[1] << BITS_PER_CHUNK_COMP;
        target[2] = this.outer_pos[2] << BITS_PER_CHUNK_COMP;
        return ChunkIndex.addToVector(this.inner_pos, target);
    }

    setWorldPos(world: VoxelWorld<TChunk>, pos: vec3) {
        this.inner_pos = ChunkIndex.fromVector(pos[0] & CHUNK_SIZE, pos[1] & CHUNK_SIZE, pos[2] & CHUNK_SIZE);
        this.outer_pos[0] = pos[0] >> BITS_PER_CHUNK_COMP;
        this.outer_pos[1] = pos[1] >> BITS_PER_CHUNK_COMP;
        this.outer_pos[2] = pos[2] >> BITS_PER_CHUNK_COMP;
        this.chunk = world.getChunk(this.outer_pos);
    }

    clone() {
        return new VoxelPointer<TChunk>(this.outer_pos, this.inner_pos, this.chunk);
    }

    copyTo(target: VoxelPointer<TChunk>) {
        target.outer_pos = this.outer_pos;
        target.inner_pos = this.inner_pos;
        target.chunk = this.chunk;
    }
}