import {Sign} from "./vecUtils";
import {vec2, vec3} from "gl-matrix";

export enum Axis {
    x, y, z
}

export enum VoxelFace {
    px, nx,
    py, ny,
    pz, nz
}

export const FaceUtils = new (class {
    private readonly ortho_axes: [Axis, Axis][] = [];

    constructor() {
        for (const primary of this.getAxes()) {
            const ortho_tuple = [];
            for (const axis of this.getAxes()) {
                if (axis != primary)
                    ortho_tuple.push(axis);
            }
            this.ortho_axes.push(ortho_tuple as [Axis, Axis]);
        }
    }

    fromParts(axis: Axis, sign: Sign): VoxelFace {
        return axis * 2 + (sign === 1 ? 0 : 1);
    }

    getInverse(face: VoxelFace): VoxelFace {
        // All positive faces have a parity of zero whereas all negative faces have a parity of one.
        // Therefore, to get the inverse of a face, we just flip the least significant bit.
        // This can be done using XOR because XOR(a, 1) == NOT(a) and XOR(a, 0) == a.
        return face ^ 1;  // => XOR(face, 1)
    }

    getAxis(face: VoxelFace) {
        return face >> 1 as Axis;  // => floor(face / 2);
    }

    getSign(face: VoxelFace) {
        return 1 - (2 * (face & 1)) as Sign;  // => (1 - 2 * x) where x is the sign of the face
    }

    *getFaces(): IterableIterator<VoxelFace> {
        for (let i = 0; i < 6; i++) {
            yield i;
        }
    }

    *getAxes(): IterableIterator<Axis> {
        for (let i = 0; i < 3; i++) {
            yield i;
        }
    }

    insersectFaceOrtho(face_axis: Axis, face_depth: number, origin: vec3, end: vec3, target: vec3 = vec3.create()): vec3 | null {
        const time = (face_depth - origin[face_axis]) / (end[face_axis] - origin[face_axis]);
        return time < 0 || time > 1 ? null : vec3.lerp(target, origin, end, time);
    }

    getOrthoAxes(axis: Axis) {
        return this.ortho_axes[axis];
    }

    orthoProject(axis: Axis, vec: vec3, target: vec2 = vec2.create()) {
        const axes = this.getOrthoAxes(axis);
        target[0] = vec[axes[0]];
        target[1] = vec[axes[1]];
        return target;
    }
})();