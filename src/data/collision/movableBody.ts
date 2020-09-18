import {vec3} from "gl-matrix";
import {Axis, FaceUtils} from "../../utils/faceUtils";
import {VoxelChunk} from "../data";
import {P$} from "ts-providers";
import {VoxelPointer} from "../pointer";

export class VoxelMovableBody<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    // >> Work objects
    private static a_aligned_ptr = VoxelPointer.empty<any>();
    private static b_aligned_ptr = VoxelPointer.empty<any>();
    private static trace_ptr = VoxelPointer.empty<any>();

    // >> Properties
    public readonly position = vec3.create();
    private readonly pointer = VoxelPointer.empty<TChunk>();

    // >> Construction
    constructor(position: Readonly<vec3>) {
        this.warpTo(position);
    }

    // >> Warping
    warpTo(pos: Readonly<vec3>) {
        vec3.copy(this.position, pos as vec3);
        this.pointer.setWorldPosRegional(pos);
    }

    warpBy(delta: Readonly<vec3>) {
        vec3.add(this.position, this.position, delta as vec3);
        this.pointer.moveByMut(delta);
    }

    // >> Movement
    moveOn(dimensions: Readonly<vec3>, has_collided: (voxel: VoxelPointer<TChunk>) => boolean, axis: Axis, delta: number): number {
        // If there is no movement, don't do anything.
        if (delta == 0) return 0;

        // Obtain some resources
        const {a_aligned_ptr, b_aligned_ptr, trace_ptr} = VoxelMovableBody;
        const ortho_axes = FaceUtils.getOrthoAxes(axis);

        // Find root vector
        this.pointer.copyTo(a_aligned_ptr);
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

    moveBy(dimensions: Readonly<vec3>, has_collided: (voxel: VoxelPointer<TChunk>) => boolean, delta: Readonly<vec3>) {
        for (const axis of FaceUtils.getAxes()) {
            this.moveOn(dimensions, has_collided, axis, delta[axis]);
        }
    }
}