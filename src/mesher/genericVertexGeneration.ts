import {ChunkIndex} from "../data/chunkIndex";
import {Axis, FaceUtils, VoxelFace} from "../utils/faceUtils";
import {MutableArrayLike} from "../utils/vecUtils";

export interface FaceVertexManipulator<T> {
    fromChunkIndex(index: ChunkIndex): T;
    addPositive(index: T, axis: Axis, magnitude: number): T;
}

export const GenericVertexGeneration = new class {
    // TODO: Support for generic quad producing

    writeVertices(buffer: MutableArrayLike<number>, root: number, stride: number, mesh: IterableIterator<number>) {
        // TODO
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
        yield flip_ab_vertices ? vertex_b : vertex_a;
        yield vertex_diag;
    }
}();