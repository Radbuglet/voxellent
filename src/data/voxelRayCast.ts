import {vec3} from "gl-matrix";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelPointer, VoxelWorld} from "./voxelData";
import {P$} from "ts-providers";

export const VoxelRayCast = new (class {
    public last_breached_face: VoxelFace = VoxelFace.px;
    public last_distance_traveled: number = 0;

    // This algorithm was adapted from "A Fast Voxel Traversal Algorithm for Ray Tracing" by John Amanatides and Andrew Woo.
    *iterFaceTraversals(position: vec3, direction: vec3) {
        // >> Find the faces associated with breaching on a given axis
        const face_x = FaceUtils.fromParts(Axis.x, direction[0] > 0 ? 1 : -1);
        const face_y = FaceUtils.fromParts(Axis.y, direction[1] > 0 ? 1 : -1);
        const face_z = FaceUtils.fromParts(Axis.z, direction[2] > 0 ? 1 : -1);

        // >> This is the distance the ray will travel to go from one edge of that axis to the other.
        // This is used to increment the dist_at_[x-z]_cross values so that they properly represent how far the vector
        // will go to reach the next breach.
        const cross_dist_step_x = Math.abs(1 / direction[0]);
        const cross_dist_step_y = Math.abs(1 / direction[1]);
        const cross_dist_step_z = Math.abs(1 / direction[2]);

        // >> This vector represents the distance at which the next voxel crossing occurs.
        // TODO: Calculate
        let dist_at_x_cross = 0;
        let dist_at_y_cross = 0;
        let dist_at_z_cross = 0;

        // >> Trace the ray!
        while (true) {
            // >> The face we cross will be on the axis which requires the least amount of distance to get to.
            // We will yield the crossed face and then move the dist_at_[x-z]_cross variable to represent the distance for
            // the next cross.

            // Is x the minimum?
            if (dist_at_x_cross < dist_at_y_cross && dist_at_x_cross < dist_at_z_cross) {  // Y cannot be the minimum
                // >> Update registers and yield
                this.last_breached_face = face_x;
                this.last_distance_traveled = dist_at_x_cross;
                yield face_x;

                // >> Update next cross distance for axis
                dist_at_x_cross += cross_dist_step_x;
                continue;
            }

            // Is y the minimum?
            if (dist_at_y_cross < dist_at_z_cross) {
                // >> Update registers and yield
                this.last_breached_face = face_y;
                this.last_distance_traveled = dist_at_y_cross;
                yield face_y;

                // >> Update next cross distance for axis
                dist_at_y_cross += cross_dist_step_y;
                continue;
            }

            // Z must be the minimum!
            {
                // >> Update registers and yield
                this.last_breached_face = face_z;
                this.last_distance_traveled = dist_at_z_cross;
                yield face_z;

                // >> Update next cross distance for axis
                dist_at_z_cross += cross_dist_step_z;
            }
        }
    }

    *iterCastVoxels<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(
            world: VoxelWorld<TChunk>, pointer: VoxelPointer<TChunk>, position: vec3, origin: vec3) {
        // TODO
    }

    getLastFaceIntersectPos(target_absolute: vec3 | null, target_relative: vec3 | null): boolean {
        throw "";  // TODO
    }
})();