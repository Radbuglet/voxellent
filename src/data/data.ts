import {vec3} from "gl-matrix";
import {P$} from "ts-providers";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VectorKey, VecUtils} from "../utils/vecUtils";
import {CHUNK_EDGE_SIZE, ChunkIndex} from "./chunkIndex";

export class VoxelWorld<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public static readonly type = Symbol();
    private readonly chunks = new Map<VectorKey, TChunk>();

    addChunk(pos: Readonly<vec3>, instance: TChunk) {
        console.assert(!this.chunks.has(VecUtils.getVectorKey(pos)) && VecUtils.isIntVec(pos as vec3));

        // Add the root chunk
        const chunk_pos = instance[VoxelChunk.type].outer_pos;
        vec3.copy(chunk_pos, pos as vec3);
        this.chunks.set(VecUtils.getVectorKey(pos), instance);

        // Flag chunk
        instance[VoxelChunk.type].in_world = true;

        // Link with neighbors
        for (const face of FaceUtils.getFaces()) {
            // Find neighbor position
            const axis = FaceUtils.getAxis(face);
            const sign = FaceUtils.getSign(face);
            chunk_pos[axis] += sign;

            // Find neighbor and link
            const neighbor = this.chunks.get(VecUtils.getVectorKey(pos));
            if (neighbor != null)
                instance[VoxelChunk.type]._linkToNeighbor(face, instance, neighbor);

            // Revert position vector to original state
            chunk_pos[axis] -= sign;
        }
    }

    removeChunk(pos: Readonly<vec3>) {
        // Find the chunk to be removed.
        const removed_chunk = this.chunks.get(VecUtils.getVectorKey(pos));
        if (removed_chunk == null) return false;

        // Unlink it!
        removed_chunk[VoxelChunk.type]._unlinkNeighbors();
        this.chunks.delete(VecUtils.getVectorKey(pos));

        // Mark chunk as no longer in a world.
        removed_chunk[VoxelChunk.type].in_world = true;

        return true;
    }

    getChunk(pos: Readonly<vec3>) {
        return this.chunks.get(VecUtils.getVectorKey(pos));
    }
}

export class VoxelChunk<TNeighbor extends P$<typeof VoxelChunk, VoxelChunk<TNeighbor>>> {
    public static readonly type = Symbol();

    public in_world = false;
    public readonly outer_pos: vec3 = vec3.create();
    private readonly neighbors: (TNeighbor | undefined)[] = new Array(6);
    private data?: ArrayBuffer;

    constructor(private bytes_per_voxel: number) {}

    // Neighbor management
    _linkToNeighbor(face: VoxelFace, self: TNeighbor, other: TNeighbor) {
        this.neighbors[face] = other;
        other[VoxelChunk.type].neighbors[FaceUtils.getInverse(face)] = self;
    }

    _unlinkNeighbors() {
        for (const face of FaceUtils.getFaces()) {
            const neighbor = this.neighbors[face];
            if (neighbor != null) {
                neighbor[VoxelChunk.type].neighbors[FaceUtils.getInverse(face)] = undefined;
                this.neighbors[face] = undefined;  // This ensures that references to dead chunks won't keep other dead chunks alive.
            }
        }
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