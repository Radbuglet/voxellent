import {vec3} from "gl-matrix";
import {P$} from "ts-providers";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VectorKey, VecUtils} from "../utils/vecUtils";

export class VoxelWorld<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public static readonly type = Symbol();
    private readonly chunks = new Map<VectorKey, TChunk>();

    addChunk(pos: Readonly<vec3>, instance: TChunk) {
        console.assert(VecUtils.isIntVec(pos as vec3));
        console.assert(!this.chunks.has(VecUtils.getVectorKey(pos)));
        console.assert(instance[VoxelChunk.type].status === VoxelChunkStatus.New);

        // Add the root chunk
        const chunk_pos = instance[VoxelChunk.type].outer_pos;
        vec3.copy(chunk_pos, pos as vec3);
        this.chunks.set(VecUtils.getVectorKey(pos), instance);

        // Flag chunk
        instance[VoxelChunk.type].status = VoxelChunkStatus.InWorld;

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
        removed_chunk[VoxelChunk.type].status = VoxelChunkStatus.Freed;

        return true;
    }

    getChunk(pos: Readonly<vec3>) {
        return this.chunks.get(VecUtils.getVectorKey(pos));
    }
}

export enum VoxelChunkStatus {
    New,
    InWorld,
    Freed
}

export class VoxelChunk<TNeighbor extends P$<typeof VoxelChunk, VoxelChunk<TNeighbor>>> {
    public static readonly type = Symbol();

    // Chunk position properties
    public status = VoxelChunkStatus.New;
    public readonly outer_pos: vec3 = vec3.create();
    private readonly neighbors: (TNeighbor | undefined)[] = new Array(6);

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
}