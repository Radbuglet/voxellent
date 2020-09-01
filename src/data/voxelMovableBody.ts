import {vec3} from "gl-matrix";
import {Axis} from "../utils/faceUtils";
import {VoxelChunk} from "./voxelData";
import {P$} from "ts-providers";

export type VoxelRayCastFunc<TChunk> = () => void;

export class VoxelMovableBody<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>> {
    constructor(private readonly position: vec3) {}

    moveOn(axis: Axis, delta: number, dimensions: vec3, cast_func: VoxelRayCastFunc<TChunk>): number {
        throw "Not implemented";
    }

    moveBy(delta: vec3, dimensions: vec3, cast_func: VoxelRayCastFunc<TChunk>) {
        throw "Not implemented";
    }
}