import {BufferUtils, PrimitiveByteCount} from "../../utils/bufferUtils";
import {ChunkIndex} from "../chunkIndex";

export class ChunkDataStore {
    public static readonly type = Symbol();

    // Chunk data properties
    private data?: DataView;
    private bytes_per_voxel!: number;

    // Constructors
    constructor(private material_id_size: PrimitiveByteCount, private data_id_size: PrimitiveByteCount) {
        this.updateBytesPerVoxel();
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