import {vec3} from "gl-matrix";
import {Axis} from "../utils/faceUtils";
import {VoxelChunk} from "./voxelData";
import {P$} from "ts-providers";

export class VoxelMovableBody<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    constructor(public position: vec3, public dimensions: vec3) {}

    moveOn(axis: Axis, delta: number): number {
        throw "Not implemented";
    }

    moveBy(delta: vec3, dimensions: vec3) {
        throw "Not implemented";
    }
}