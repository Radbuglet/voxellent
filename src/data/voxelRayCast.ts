import {VoxelChunk, VoxelPointer, VoxelWorld} from "./voxelData";
import {P$} from "ts-providers";
import {vec3} from "gl-matrix";
import {FaceUtils} from "../utils/faceUtils";
import {VecUtils} from "../utils/vecUtils";

export class VoxelRayCast<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    public pointer: VoxelPointer<TChunk>;

    constructor(world: VoxelWorld<TChunk>, public position: vec3) {
        this.pointer = world.getVoxel(vec3.clone(position));
    }

    // TODO: Skip over empty chunks (if allowed by user)
    // FIXME: This implementation is incorrect
    *step(world: VoxelWorld<TChunk>, delta_normalized: vec3): IterableIterator<vec3> {
        // Claim work vectors
        const claimed_last_pos = VecUtils.vec3_pool.obtain();
        const claimed_intersect_point = VecUtils.vec3_pool.obtain();
        const claimed_pointer_ws = VecUtils.vec3_pool.obtain();

        // Store last position
        vec3.copy(claimed_last_pos, this.position);
        vec3.add(this.position, this.position, delta_normalized);

        // Step through voxels
        for (const axis of FaceUtils.getAxes()) {
            // Check if we crossed any voxel boundaries on the axis
            const old_axis_voxel = Math.floor(claimed_last_pos[axis]);
            const new_axis_voxel = Math.floor(this.position[axis]);
            if (new_axis_voxel != old_axis_voxel) {
                // Update the pointer
                this.pointer.getNeighbor(world, FaceUtils.fromParts(axis, delta_normalized[axis] > 0 ? 1 : -1), this.pointer);  // (writes to the pointer)

                // Get intersection point
                const intersect_point = FaceUtils.insersectFaceOrtho(axis, delta_normalized[axis] > 0 ? new_axis_voxel : old_axis_voxel,
                    claimed_last_pos, this.position, claimed_intersect_point);
                if (intersect_point == null) continue;  // No intersection

                // Ensure that intersection is within the voxel.
                const pointer_ws = this.pointer.getWorldPos(claimed_pointer_ws);
                const ortho_axes = FaceUtils.getOrthoAxes(axis);
                const axis_a_rel = intersect_point[ortho_axes[0]] - pointer_ws[ortho_axes[0]];
                const axis_b_rel = intersect_point[ortho_axes[1]] - pointer_ws[ortho_axes[1]];
                if (axis_a_rel < 0 || axis_a_rel > 1 || axis_b_rel < 0 || axis_b_rel > 1) continue;

                // TODO: Expose relative coords?
                yield intersect_point;
            }
        }

        // Release work vectors
        VecUtils.vec3_pool.release(claimed_last_pos);
        VecUtils.vec3_pool.release(claimed_intersect_point);
        VecUtils.vec3_pool.release(claimed_pointer_ws);
    }

    getPosition(): vec3 {
        return this.position;
    }

    warpToPosition(world: VoxelWorld<TChunk>, position: vec3) {
        vec3.copy(this.position, position);
        this.pointer.setWorldPos(world, position);
    }

    warpToPointed(pointer: VoxelPointer<TChunk>, position: vec3) {
        vec3.copy(this.position, position);
        pointer.copyTo(this.pointer);
    }
    
    copyTo(other: VoxelRayCast<TChunk>) {
        vec3.copy(other.position, this.position);
        this.pointer.copyTo(other.pointer);
    }
}