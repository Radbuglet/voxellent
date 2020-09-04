import {vec3} from "gl-matrix";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";

export interface IRayCrossEnumerator {
    // TODO
}

export class VoxelRayCast {
    // TODO
}

export class FreeRayCrossEnumerator implements IRayCrossEnumerator {
    // >> Status registers
    public last_breached_face: VoxelFace = VoxelFace.px;
    public last_distance_traveled: number = 0;

    // >> Traversal state
    // Represents the ray in world-space. This is used to convert distances back into positions.
    public origin!: vec3;
    public direction!: vec3;

    // Represents the faces associated with breaching on a given axis
    private face_x!: VoxelFace;
    private face_y!: VoxelFace;
    private face_z!: VoxelFace;

    // This is used to increment the dist_at_[x-z]_cross values so that they properly represent how far the vector
    // will go to reach the next breach.
    private cross_dist_step_x!: number;
    private cross_dist_step_y!: number;
    private cross_dist_step_z!: number;

    // This vector represents the distance at which the next voxel crossing occurs.
    private dist_at_x_cross!: number;
    private dist_at_y_cross!: number;
    private dist_at_z_cross!: number;

    // >> Construction
    constructor(origin: vec3, direction: vec3) {
        this.warpPositionAndDirection(origin, direction);
    }

    warpPosition(new_origin: vec3) {  // TODO: Implement
        this.origin = new_origin;
        this.dist_at_x_cross = 0;
        this.dist_at_y_cross = 0;
        this.dist_at_z_cross = 0;
    }

    warpDirection(new_direction: vec3) {
        this.warpPositionAndDirection(this.origin, new_direction);
    }

    warpPositionAndDirection(new_origin: vec3, new_direction: vec3) {
        // Update the world-space direction state
        this.direction = new_direction;

        // Figure out the faces crossed on a breach of each axis.
        this.face_x = FaceUtils.fromParts(Axis.x, new_direction[0] > 0 ? 1 : -1);
        this.face_y = FaceUtils.fromParts(Axis.y, new_direction[1] > 0 ? 1 : -1);
        this.face_z = FaceUtils.fromParts(Axis.z, new_direction[2] > 0 ? 1 : -1);

        // Figure out the distance needed to cross from one edge to the other.
        this.cross_dist_step_x = Math.abs(1 / new_direction[0]);
        this.cross_dist_step_y = Math.abs(1 / new_direction[1]);
        this.cross_dist_step_z = Math.abs(1 / new_direction[2]);

        // Update the position
        this.warpPosition(new_origin);
    }

    step() {
        // >> The face we cross will be on the axis which requires the least amount of distance to get to.
        // We will yield the crossed face and then move the dist_at_[x-z]_cross variable to represent the distance for
        // the next cross.

        // Is x the minimum?
        if (this.dist_at_x_cross < this.dist_at_y_cross && this.dist_at_x_cross < this.dist_at_z_cross) {  // Y cannot be the minimum
            // >> Update registers and yield
            this.last_breached_face = this.face_x;
            this.last_distance_traveled = this.dist_at_x_cross;

            // >> Update next cross distance for axis
            this.dist_at_x_cross += this.cross_dist_step_x;
            return;
        }

        // Is y the minimum?
        if (this.dist_at_y_cross < this.dist_at_z_cross) {
            // >> Update registers and yield
            this.last_breached_face = this.face_y;
            this.last_distance_traveled = this.dist_at_y_cross;

            // >> Update next cross distance for axis
            this.dist_at_y_cross += this.cross_dist_step_y;
            return;
        }

        // Z must be the minimum!
        {
            // >> Update registers and yield
            this.last_breached_face = this.face_z;
            this.last_distance_traveled = this.dist_at_z_cross;

            // >> Update next cross distance for axis
            this.dist_at_z_cross += this.cross_dist_step_z;
        }
    }

    getLastRayFacePosition() {
        throw "Not implemented"; // TODO
    }
}

export class AxisCrossEnumerator implements IRayCrossEnumerator {
    // TODO
}