import {vec3} from "gl-matrix";
import {Axis, FaceUtils, VoxelFace} from "../../utils/faceUtils";
import {ReadonlyVoxelPointer, VoxelPointer} from "../pointer";
import {ChunkIndex} from "../chunkIndex";
import {VecUtils} from "../../utils/vecUtils";

// Adapted from the paper "A Fast Voxel Traversal Algorithm for Ray Tracing" by John Amanatides and Andrew Woo.
// https://web.archive.org/web/20200215082332/http://www.cse.chalmers.se/edu/year/2010/course/TDA361/grid.pdf
export class VoxelRayCast<TUserChunk> {
    // >> Status registers
    public breached_face = VoxelFace.px;
    public distance_traveled = 0;

    // >> Traversal state
    // Represents the ray in world-space. This is used to convert distances back into positions.
    private readonly _pointer = VoxelPointer.empty<TUserChunk>();
    private _origin!: Readonly<vec3>;
    private _direction!: Readonly<vec3>;

    // Represents the faces associated with breaching on a given axis
    private axis_faces: VoxelFace[] = new Array(3);  // These will be initialized.

    // This is used to increment the dist_at_[x-z]_cross values so that they properly represent how far the vector
    // will go to reach the next breach.
    private cross_dist_step = vec3.create();

    // This vector represents the distance at which the next voxel crossing occurs.
    private dist_at_cross = vec3.create();

    // >> Construction
    constructor(origin: Readonly<vec3>, direction: Readonly<vec3>) {
        this.warpPositionAndDirection(origin, direction);
    }

    // >> Warp logic
    private warpPositionNoPtr(new_origin: Readonly<vec3>) {
        this._origin = new_origin;

        // Update distances at next cross.
        for (const axis of FaceUtils.getAxes()) {
            this.dist_at_cross[axis] = this._direction[axis] === 0 ? Infinity :  // If this component is zero, we will never cross
                // Otherwise, the distance is equal to the full length distance times the percent of the axis already traversed.
                this.cross_dist_step[axis] * -FaceUtils.signOf(this._direction[axis]) * (Math.floor(this._origin[axis]) - this._origin[axis]);
        }
    }

    private warpOnlyDirection(new_direction: Readonly<vec3>) {
        // Update the world-space direction state
        this._direction = new_direction;

        // Update directional state
        for (const axis of FaceUtils.getAxes()) {
            // Figure out the faces crossed on a breach of each axis.
            this.axis_faces[axis] = FaceUtils.fromParts(axis, FaceUtils.signOf(new_direction[axis]));

            // Figure out the distance needed to cross from one edge to the other.
            this.cross_dist_step[axis] = Math.abs(1 / new_direction[axis]);
        }
    }

    get pointer(): ReadonlyVoxelPointer<TUserChunk> {
        return this._pointer;
    }

    get origin(): Readonly<vec3> {
        return this._origin;
    }

    set origin(new_origin: Readonly<vec3>) {
        this._pointer.setWorldPosRegional(new_origin);  // Pointer needs to be changed.
        this.warpPositionNoPtr(new_origin);  // To need to refresh direction.
    }

    get direction(): Readonly<vec3> {
        return this._direction;
    }

    set direction(new_direction: Readonly<vec3>) {
        this.warpOnlyDirection(new_direction);
        this.warpPositionNoPtr(this._origin);  // The pointer is still valid, no need to refresh.
    }

    warpPositionAndDirection(new_origin: Readonly<vec3>, new_direction: Readonly<vec3>) {
        this._pointer.setWorldPosRegional(new_origin);  // Pointer needs refresh
        this.warpOnlyDirection(new_direction);  // We first update the direction of the vector.
        this.warpPositionNoPtr(new_origin);  // Then we update the position state to both set the origin and apply it.
    }

    // >> Register methods
    resetDistanceCounter() {
        this.distance_traveled = 0;
    }

    getFaceIntersection(target: vec3 = vec3.create()): vec3 {
        vec3.scale(target, this._direction as vec3, this.distance_traveled);
        vec3.add(target, this._origin as vec3, target);
        return target;
    }

    // >> Ray-cast logic
    step() {
        // >> The face we cross will be on the axis which requires the least amount of distance to get to.
        // We will yield the crossed face and then move the dist_at_[x-z]_cross variable to represent the distance for
        // the next cross.
        let closest_axis!: Axis;
        let closest_dist = Infinity;

        // >> Find the face that takes the least amount of distance to breach
        for (const axis of FaceUtils.getAxes()) {
            if (this.dist_at_cross[axis] < closest_dist) {
                closest_dist = this.dist_at_cross[axis];
                closest_axis = axis;
            }
        }

        // >> Perform the step.
        // Update registers
        this.breached_face = this.axis_faces[closest_axis];
        this.distance_traveled = closest_dist;

        // >> Update pointed voxel
        this._pointer.getNeighborMut(this.breached_face);

        // >> Update next cross distance for axis
        this.dist_at_cross[closest_axis] += this.cross_dist_step[closest_axis];
    }

    skipChunk() {
        // >> Find closest chunk face to be crossed
        let closest_axis!: Axis;
        let min_dist_at_cross = Infinity;

        for (const axis of FaceUtils.getAxes()) {
            const dist_at_cross = this.dist_at_cross[axis] + this.cross_dist_step[axis] * ChunkIndex.getComponentDistToEdge(
                this._pointer.inner_pos, axis, FaceUtils.signOf(this._direction[axis]));

            if (dist_at_cross < min_dist_at_cross) {
                min_dist_at_cross = dist_at_cross;
                closest_axis = axis;
            }
        }

        // >> Update registers
        const dist_moved = min_dist_at_cross - this.distance_traveled;
        this.dist_at_cross[0] += dist_moved;
        this.dist_at_cross[1] += dist_moved;
        this.dist_at_cross[2] += dist_moved;
        this.distance_traveled += min_dist_at_cross;
        this.breached_face = this.axis_faces[closest_axis];

        // >> Move voxel pointer
        this._pointer.moveByMut(vec3.scale(VecUtils.work_vec, this._direction as vec3, dist_moved));
    }
}