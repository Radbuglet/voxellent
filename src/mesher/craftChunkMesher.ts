import {VoxelFace} from "../data/face";
import {VoxelChunk, VoxelPointer} from "../data/voxelData";
import {P$} from "ts-providers";

type Rect2 = any;  // TODO
type Quad = any;

type FaceDeclareFunc = (face: VoxelFace, part: Rect2, generator: (quad: Quad) => void) => void;

type FaceBuilderFunc<T extends P$<typeof VoxelChunk, VoxelChunk<T>>> =
    (pointer: VoxelPointer<T>, declareFace: FaceDeclareFunc) => void;

type InstanceBuilderFunc<T extends P$<typeof VoxelChunk, VoxelChunk<T>>> =
    (pointer: VoxelPointer<T>) => void;

export function createCraftChunkMesh<TChunk extends P$<typeof VoxelChunk, VoxelChunk<TChunk>>>(
        chunk: TChunk, face_builder: FaceBuilderFunc<TChunk>, instance_builder: InstanceBuilderFunc<TChunk>) {
    throw "Not implemented";  // TODO
}