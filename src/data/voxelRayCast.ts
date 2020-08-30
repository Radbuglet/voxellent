import {VoxelChunk, VoxelPointer, VoxelWorld} from "./voxelData";
import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {FaceUtils, VoxelFace} from "../utils/faceUtils";

export class VoxelRayCast<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public readonly pointer: VoxelPointer<TChunk>;

    constructor(world: VoxelWorld<TChunk>, public readonly position: vec3) {
        this.pointer = world.getVoxel(position);
    }

    step(world: VoxelWorld<TChunk>, delta_normalized: vec3) {
        const crossed_faces: VoxelFace[] = [];

        // Find next voxel position
        for (const axis of FaceUtils.getAxes()) {
            // Update vector
            let old_comp = this.position[axis];
            this.position[axis] += delta_normalized[axis];

            // If we moved by a voxel on any axis, update the pointer.
            if (Math.floor(this.position[axis]) != Math.floor(old_comp)) {
                const face = FaceUtils.fromParts(axis, delta_normalized[axis] > 0 ? 1 : -1);
                this.pointer.getNeighbor(world, face, this.pointer);  // (writes to the pointer)
                crossed_faces.push(face);
            }
        }

        // Detect a collision on any crossed faces
        for (const face of crossed_faces) {
            // TODO
        }
    }
}