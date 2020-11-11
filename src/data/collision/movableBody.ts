import {vec3} from "gl-matrix";
import {Axis, FaceUtils} from "../../utils/faceUtils";
import {ReadonlyVoxelPointer, VoxelPointer} from "../pointer";

export class VoxelMovableBody<TUserChunk> {
    // >> Work objects
    private static a_aligned_ptr = VoxelPointer.empty<any>();
    private static b_aligned_ptr = VoxelPointer.empty<any>();
    private static trace_ptr = VoxelPointer.empty<any>();

    // >> Properties
    private readonly _position = vec3.create();
    private readonly _pointer = VoxelPointer.empty<TUserChunk>();

    // >> Construction
    constructor(position: Readonly<vec3>) {
        this.position = position;
    }

    // >> Warping
    get position(): Readonly<vec3> {
        return this._position;
    }

    get pointer(): ReadonlyVoxelPointer<TUserChunk> {
        return this._pointer;
    }

    set position(pos: Readonly<vec3>) {
        vec3.copy(this._position, pos as vec3);
        this._pointer.setWorldPosRegional(pos);
    }

    warpBy(delta: Readonly<vec3>) {
        vec3.add(this._position, this._position, delta as vec3);
        this._pointer.moveByMut(delta);
    }

    // >> Movement
    moveOn(dimensions: Readonly<vec3>, has_collided: (voxel: VoxelPointer<TUserChunk>) => boolean, axis: Axis, delta: number): number {
        // If there is no movement, don't do anything.
        if (delta == 0) return 0;

        // Obtain some resources
        const {a_aligned_ptr, b_aligned_ptr, trace_ptr} = VoxelMovableBody;
        const ortho_axes = FaceUtils.getOrthoAxes(axis);

        // Find root vector
        this._pointer.copyTo(a_aligned_ptr);
        if (delta > 0) {  // If the delta is positive, we're operating on the opposite face.
            a_aligned_ptr.getNeighborMut(FaceUtils.fromParts(axis, 1), dimensions[axis]);
        }

        // Enumerate face rays (behold, the pyramid of doom)
        let max_distance = delta;
        for (let a_dist = 0; a_dist < dimensions[ortho_axes[0]]; a_dist++) {
            // Warp the b_aligned pointer back to the lowest value.
            a_aligned_ptr.copyTo(b_aligned_ptr);

            // Move along the b axis
            for (let b_dist = 0; b_dist < dimensions[ortho_axes[1]]; b_dist++) {
                // Warp the trace pointer to the face voxel.
                b_aligned_ptr.copyTo(trace_ptr);

                // Trace along the face!
                for (let trace_dist = 0; trace_dist < max_distance; trace_dist++) {
                    // Check for collision
                    if (has_collided(trace_ptr)) {
                        max_distance = trace_dist;
                        break;
                    }

                    // Move the trace pointer along.
                    trace_ptr.getNeighborMut(FaceUtils.fromParts(axis, 1));
                }

                // Move the b pointer along
                b_aligned_ptr.getNeighborMut(FaceUtils.fromParts(ortho_axes[1], 1));
            }

            // Move the a pointer along
            a_aligned_ptr.getNeighborMut(FaceUtils.fromParts(ortho_axes[0], 1));
        }

        // Return the minimum distance that was traveled.
        return max_distance;
    }

    moveBy(dimensions: Readonly<vec3>, has_collided: (voxel: VoxelPointer<TUserChunk>) => boolean, delta: Readonly<vec3>) {
        for (const axis of FaceUtils.getAxes()) {
            this.moveOn(dimensions, has_collided, axis, delta[axis]);
        }
    }
}