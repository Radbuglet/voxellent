import {vec3} from "gl-matrix";
import {Axis, FaceUtils} from "../../utils/faceUtils";
import {VoxelChunk, VoxelWorld} from "../data";
import {P$} from "ts-providers";
import {VoxelPointer} from "../pointer";

export class VoxelMovableBody<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    private static work_ptr_root = new VoxelPointer<any>();

    // >> Construction
    constructor(public position: vec3, public dimensions: vec3, private readonly pointer: VoxelPointer<TChunk> = new VoxelPointer<TChunk>()) {}

    // >> Movement
    moveOn(world: VoxelWorld<TChunk>, axis: Axis, delta: number): number {
        // If there is no movement, don't do anything.
        if (delta == 0) return 0;

        // Move to the corner
        if (delta > 0) {  // If the delta is positive, we're operating on the opposite face.
            this.pointer.getNeighborMut(FaceUtils.fromParts(axis, 1), world, this.dimensions[axis]);
        }
        this.pointer.copyTo(VoxelMovableBody.work_ptr_root);

        // Enumerate face rays
        let max_distance = delta;
        // TODO

        // Move pointer back to the origin
        if (delta > 0) {
            this.pointer.getNeighborMut(FaceUtils.fromParts(axis, -1), world, this.dimensions[axis]);
        }
        return max_distance;
    }

    moveBy(delta: vec3, dimensions: vec3) {
        throw "Not implemented";
    }
}