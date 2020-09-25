import {vec3} from "gl-matrix";
import {P$} from "ts-providers";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VectorKey, VecUtils} from "../utils/vecUtils";
import {ChunkIndex} from "./chunkIndex";
import {BufferUtils, PrimitiveByteCount} from "../utils/bufferUtils";

export class VoxelWorld<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public static readonly type = Symbol();
    private readonly chunks = new Map<VectorKey, TChunk>();

    addChunk(pos: Readonly<vec3>, instance: TChunk) {
        console.assert(VecUtils.isIntVec(pos as vec3));
        console.assert(!this.chunks.has(VecUtils.getVectorKey(pos)));
        console.assert(!instance[VoxelChunk.type].in_world);

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
        removed_chunk[VoxelChunk.type].in_world = false;

        return true;
    }

    getChunk(pos: Readonly<vec3>) {
        return this.chunks.get(VecUtils.getVectorKey(pos));
    }
}

export class VoxelChunk<TNeighbor extends P$<typeof VoxelChunk, VoxelChunk<TNeighbor>>> {
    public static readonly type = Symbol();

    // Chunk position properties
    public in_world = false;
    public readonly outer_pos: vec3 = vec3.create();
    private readonly neighbors: (TNeighbor | undefined)[] = new Array(6);

    // Chunk data properties
    private data?: DataView;
    private bytes_per_voxel!: number;

    // Constructors
    constructor(private material_id_size: PrimitiveByteCount, private data_id_size: PrimitiveByteCount) {
        this.updateBytesPerVoxel();
    }

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

    // Voxel buffer management
    private updateBytesPerVoxel() {
        this.bytes_per_voxel = this.material_id_size + this.data_id_size;
    }

    allocateVoxelData(material_id_size?: PrimitiveByteCount, data_id_size?: PrimitiveByteCount) {
        // Update buffer config
        if (material_id_size != null) this.material_id_size = material_id_size;
        if (data_id_size != null) this.data_id_size = data_id_size;
        this.updateBytesPerVoxel();

        // Reallocate the buffer
        this.data = new DataView(new ArrayBuffer(this.bytes_per_voxel * ChunkIndex.chunk_voxel_count));
    }

    ensureDataAllocation() {
        if (!this.hasVoxelData()) {
            this.allocateVoxelData();
        }
    }

    ensureDataAllocationConfig(material_id_size?: PrimitiveByteCount, data_id_size?: PrimitiveByteCount) {
        if (!this.hasVoxelData() || material_id_size !== this.material_id_size || data_id_size !== this.data_id_size) {
            this.allocateVoxelData(material_id_size, data_id_size);
        }
    }

    hasVoxelData() {
        return this.data != null;
    }

    removeVoxelData() {
        this.data = undefined;
    }

    // Voxel management
    getVoxelMaterial(pos: ChunkIndex): number | null {
        return this.hasVoxelData() ? BufferUtils.getUintDynamic(this.data!, this.material_id_size, pos * this.bytes_per_voxel) : null;
    }

    getVoxelData(pos: ChunkIndex) {
        return this.hasVoxelData() ? BufferUtils.getUintDynamic(this.data!, this.data_id_size, pos * this.bytes_per_voxel + this.material_id_size) : null;
    }

    setVoxelMaterial(pos: ChunkIndex, value: number): boolean {
        if (this.hasVoxelData()) {
            BufferUtils.setUintDynamic(this.data!, this.material_id_size, pos, value);
            return true;
        }
        return false;
    }

    setVoxelData(pos: ChunkIndex, value: number) {
        if (this.hasVoxelData()) {
            BufferUtils.setUintDynamic(this.data!, this.data_id_size, pos * this.bytes_per_voxel + this.material_id_size, value);
            return true;
        }
        return false;
    }
}