import {VoxelChunk, VoxelPointer, VoxelWorld} from "./voxelData";
import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {FaceUtils} from "../utils/faceUtils";

export class VoxelRayCast<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public readonly pointer: VoxelPointer<TChunk>;
    public readonly last_position: vec3;

    constructor(world: VoxelWorld<TChunk>, public readonly position: vec3) {
        this.last_position = vec3.clone(this.position);
        this.pointer = world.getVoxel(vec3.clone(position));
    }

    *step(world: VoxelWorld<TChunk>, delta_normalized: vec3, intersect_pos: vec3 = vec3.create(), pointer_ws: vec3 = vec3.create()): IterableIterator<vec3> {
        // Store last position
        vec3.copy(this.last_position, this.position);
        vec3.add(this.position, this.position, delta_normalized);

        // Step through voxels
        for (const axis of FaceUtils.getAxes()) {
            // Check if we crossed any voxel boundaries on the axis
            const old_axis_voxel = Math.floor(this.last_position[axis]);
            const new_axis_voxel = Math.floor(this.position[axis]);
            if (new_axis_voxel != old_axis_voxel) {
                // Update the pointer
                this.pointer.getNeighbor(world, FaceUtils.fromParts(axis, delta_normalized[axis] > 0 ? 1 : -1), this.pointer);  // (writes to the pointer)

                // Get intersection point
                const intersect_point = FaceUtils.insersectFaceOrtho(axis, delta_normalized[axis] > 0 ? new_axis_voxel : old_axis_voxel,
                    this.last_position, this.position, intersect_pos);
                if (intersect_point == null) continue;  // No intersection

                // Ensure that intersection is within the voxel.
                this.pointer.getWorldPos(pointer_ws);
                const ortho_axes = FaceUtils.getOrthoAxes(axis);
                const axis_a_rel = intersect_point[ortho_axes[0]] - pointer_ws[ortho_axes[0]];
                const axis_b_rel = intersect_point[ortho_axes[1]] - pointer_ws[ortho_axes[1]];
                if (axis_a_rel < 0 || axis_a_rel > 1 || axis_b_rel < 0 || axis_b_rel > 1) continue;

                // TODO: Expose relative coords?
                yield intersect_point;
            }
        }
    }
}