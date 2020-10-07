import {Sign} from "./vecUtils";

export enum Axis {
    x, y, z
}

export enum VoxelFace {
    px, nx,
    py, ny,
    pz, nz
}

export const FaceUtils = new class {
    private readonly axes: Axis[] = [];
    private readonly faces: VoxelFace[] = [];
    private readonly ortho_axes: [Axis, Axis][] = [];

    constructor() {
        // Generate axis list
        for (let i = 0; i < 3; i++) {
            this.axes.push(i);
        }

        // Generate face list
        for (let i = 0; i < 6; i++) {
            this.faces.push(i);
        }

        // Generate orthogonal axes
        for (const primary of this.getAxes()) {
            const ortho_tuple = [];
            for (const axis of this.getAxes()) {
                if (axis != primary)
                    ortho_tuple.push(axis);
            }
            this.ortho_axes.push(ortho_tuple as [Axis, Axis]);
        }
    }

    signOf(v: number): Sign {
        return v > 0 ? 1 : -1;
    }

    distToEdge(value: number, max: number, sign: Sign) {
        return sign === 1 ? max - value : value;
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

    getFaces(): ReadonlyArray<VoxelFace> {
        return this.faces;
    }

    getAxes(): ReadonlyArray<Axis> {
        return this.axes;
    }

    getOrthoAxes(axis: Axis) {
        return this.ortho_axes[axis];
    }
}();