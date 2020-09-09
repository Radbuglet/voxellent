import {vec3} from "gl-matrix";
import {P$} from "ts-providers";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VectorKey, VecUtils} from "../utils/vecUtils";
import {CHUNK_EDGE_SIZE, ChunkIndex} from "./chunkIndex";

export class VoxelWorld<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public static readonly type = Symbol();
    private readonly chunks = new Map<VectorKey, TChunk>();

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

    removeChunk(pos: Readonly<vec3>) {
        return this.chunks.delete(VecUtils.getVectorKey(pos));
    }

    getChunk(pos: Readonly<vec3>) {
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