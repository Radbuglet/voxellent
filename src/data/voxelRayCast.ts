import {VoxelChunk, VoxelPointer, VoxelWorld} from "./voxelData";
import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {FaceUtils} from "../utils/faceUtils";

export type RayCastIntersection = {};

export class VoxelRayCast<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public readonly pointer: VoxelPointer<TChunk>;

    constructor(world: VoxelWorld<TChunk>, public readonly position: vec3) {
        this.pointer = world.getVoxel(vec3.clone(position));
    }

    *step(world: VoxelWorld<TChunk>, delta_normalized: vec3): IterableIterator<RayCastIntersection> {
        for (const axis of FaceUtils.getAxes()) {
            // Update vector
            let old_comp = this.position[axis];
            this.position[axis] += delta_normalized[axis];

            // Check if we crossed any voxel boundaries on the axis
            if (Math.floor(this.position[axis]) != Math.floor(old_comp)) {
                // Update the pointer
                const face = FaceUtils.fromParts(axis, delta_normalized[axis] > 0 ? 1 : -1);
                this.pointer.getNeighbor(world, face, this.pointer);  // (writes to the pointer)

                // Check for a collision
                // TODO
            }
        }
    }
}