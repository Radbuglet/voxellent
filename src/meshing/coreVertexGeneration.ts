import {ChunkIndex} from "../data/chunkIndex";
import {MutableArrayLike} from "../utils/vecUtils";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {ShaderChunkIndex} from "./compactFaceEncoder";

export interface FaceVertexManipulator<T> {
    fromChunkIndex(index: ChunkIndex): T;
    addPositive(index: T, axis: Axis, magnitude: number): T;
}

export class WriteableVertexBuffer<T> {
    constructor(public target: MutableArrayLike<T>, public root_index: number = 0, public size: number = 0) {}

    writePart(values: Iterable<T>, offset: number) {
        let index = this.root_index + offset;
        for (const value of values) {
            console.assert(index < this.root_index + this.size);
            this.target[index++] = value;
        }
    }

    nextElement() {
        this.root_index += this.size;
    }
}

export const CoreVertexGeneration = new class {
    *generateQuadGeneric<T>(a: T, b: T, c: T, d: T, ccw_culling: boolean = true): IterableIterator<T> {
        // Triangle 1
        yield a;
        yield ccw_culling ? b : c;
        yield ccw_culling ? c : b;

        // Triangle 2
        yield a;
        yield ccw_culling ? c : d;
        yield ccw_culling ? d : c;
    }

    // TODO: Add support for slabs
    *generateFaceGeneric<T>(voxel: ChunkIndex, face: VoxelFace, manipulator: FaceVertexManipulator<T>, ccw_culling: boolean = true): IterableIterator<T> {
        // >> Get axes operated on
        const axis = FaceUtils.getAxis(face);
        const ortho_axes = FaceUtils.getOrthoAxes(axis);

        // >> Get the root of the face
        const is_opposite_side = FaceUtils.getSign(face) === 1
        let root_index = manipulator.fromChunkIndex(voxel);
        if (is_opposite_side) {
            root_index = manipulator.addPositive(root_index, axis, 1);
        }

        // >> Generate the other vertices
        const vertex_a = manipulator.addPositive(root_index, ortho_axes[0], 1);
        const vertex_b = manipulator.addPositive(root_index, ortho_axes[1], 1);
        const vertex_diag = manipulator.addPositive(vertex_a, ortho_axes[1], 1);

        // >> Emit vertices
        const flip_ab_vertices = ccw_culling === is_opposite_side;

        // Triangle one
        yield root_index;
        yield flip_ab_vertices ? vertex_a : vertex_b;
        yield vertex_diag;

        // Triangle 2
        yield root_index;
        yield vertex_diag;
        yield flip_ab_vertices ? vertex_b : vertex_a;
    }

    generateFaceCompact(voxel: ChunkIndex, face: VoxelFace, ccw_culling: boolean = true) {
        return CoreVertexGeneration.generateFaceGeneric<ShaderChunkIndex>(voxel, face, ShaderChunkIndex, ccw_culling);
    }
}();