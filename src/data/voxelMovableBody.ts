import {vec3} from "gl-matrix";
import {Axis} from "../utils/faceUtils";
import {VoxelChunk} from "./voxelData";
import {P$} from "ts-providers";
import {VecUtils} from "../utils/vecUtils";

export class VoxelMovableBody<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    constructor(public position: vec3, public dimensions: vec3) {}

    moveOn(axis: Axis, delta: number): number {
        // Find the starting origin point
        let claimed_origin = VecUtils.vec3_pool.obtain();
        vec3.copy(claimed_origin, this.position);
        if (delta > 0) {
            claimed_origin[axis] += this.dimensions[axis];
        }

        // Iterate sample volume
        // TODO
        throw "Not implemented";
    }

    moveBy(delta: vec3, dimensions: vec3) {
        throw "Not implemented";
    }
}