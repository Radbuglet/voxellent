import {vec3} from "gl-matrix";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {VoxelChunk, VoxelWorld} from "./data";
import {P$} from "ts-providers";
import {VoxelPointer} from "./pointer";

export class VoxelRayCast<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    // >> Status registers
    public breached_face: VoxelFace = VoxelFace.px;
    public distance_traveled: number = 0;

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
    constructor(world: VoxelWorld<TChunk>, origin: vec3, direction: vec3, public readonly pointer: VoxelPointer<TChunk> = new VoxelPointer<TChunk>()) {
        this.warpPositionAndDirection(world, origin, direction);
    }

    // >> Warp logic
    private warpPositionNoPtr(new_origin: vec3) {
        this.origin = new_origin;

        // Get initial distance to cross.
        this.dist_at_x_cross = this.direction[0] === 0 ? Infinity :  // If this component is zero, we will never cross
            // Otherwise, the distance is equal to the full length distance times the percent of the axis already traversed.
            this.cross_dist_step_x * (this.direction[0] > 0 ? -1 : 1) * (Math.floor(this.origin[0]) - this.origin[0]);

        this.dist_at_y_cross = this.direction[1] === 0 ? Infinity :
            this.cross_dist_step_y * (this.direction[1] > 0 ? -1 : 1) * (Math.floor(this.origin[1]) - this.origin[1]);

        this.dist_at_z_cross = this.direction[2] === 0 ? Infinity :
            this.cross_dist_step_z * (this.direction[2] > 0 ? -1 : 1) * (Math.floor(this.origin[2]) - this.origin[2]);
    }

    private warpOnlyDirection(new_direction: vec3) {
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
    }

    warpPosition(world: VoxelWorld<any>, new_origin: vec3) {
        this.pointer.setWorldPos(world, new_origin);  // Pointer needs refresh
        this.warpPositionNoPtr(new_origin);  // To need to refresh direction.
    }

    warpDirection(new_direction: vec3) {
        this.warpOnlyDirection(new_direction);
        this.warpPositionNoPtr(this.origin);  // The pointer is still valid, no need to refresh.
    }

    warpPositionAndDirection(world: VoxelWorld<any>, new_origin: vec3, new_direction: vec3) {
        this.pointer.setWorldPos(world, new_origin);  // Pointer needs refresh
        this.warpOnlyDirection(new_direction);  // We first update the direction of the vector.
        this.warpPositionNoPtr(new_origin);  // Then we update the position state to both set the origin and apply it.
    }

    // >> Ray-cast logic
    step(world: VoxelWorld<TChunk>) {
        // >> The face we cross will be on the axis which requires the least amount of distance to get to.
        // We will yield the crossed face and then move the dist_at_[x-z]_cross variable to represent the distance for
        // the next cross.

        // Is x the minimum?
        if (this.dist_at_x_cross < this.dist_at_y_cross && this.dist_at_x_cross < this.dist_at_z_cross) {  // Y cannot be the minimum
            // >> Update registers and yield
            this.breached_face = this.face_x;
            this.distance_traveled = this.dist_at_x_cross;

            // >> Update pointed voxel
            this.pointer.getNeighbor(world, this.face_x, this.pointer);

            // >> Update next cross distance for axis
            this.dist_at_x_cross += this.cross_dist_step_x;
            return;
        }

        // Is y the minimum?
        if (this.dist_at_y_cross < this.dist_at_z_cross) {
            // >> Update registers and yield
            this.breached_face = this.face_y;
            this.distance_traveled = this.dist_at_y_cross;

            // >> Update pointed voxel
            this.pointer.getNeighbor(world, this.face_y, this.pointer);

            // >> Update next cross distance for axis
            this.dist_at_y_cross += this.cross_dist_step_y;
            return;
        }

        // Z must be the minimum!
        {
            // >> Update registers and yield
            this.breached_face = this.face_z;
            this.distance_traveled = this.dist_at_z_cross;

            // >> Update pointed voxel
            this.pointer.getNeighbor(world, this.face_z, this.pointer);

            // >> Update next cross distance for axis
            this.dist_at_z_cross += this.cross_dist_step_z;
        }
    }

    getFaceIntersection(target: vec3 = vec3.create()): vec3 {
        vec3.scale(target, this.direction, this.distance_traveled);
        vec3.add(target, this.origin, target);
        return target;
    }
}