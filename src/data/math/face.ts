import {vec3} from "gl-matrix";

export enum Axis {
    x, y, z
}

export enum VoxelFace {
    px, nx,
    py, ny,
    pz, nz
}

export const FaceUtils = new (class {
    private readonly towards_vecs: vec3[] = new Array(6);

    constructor() {
        // Populate `towards_vec` rainbow table
        for (let i = 0; i < this.towards_vecs.length; i++) {
            const vec: vec3 = [0, 0, 0];
            vec[i >> 1] = this.getSign(i);
            this.towards_vecs[i] = vec;
        }
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
        return 1 - (face ^ 1 << 1) as 1 | -1;  // => (1 - 2 * x) where x is the sign of the face
    }

    getTowardsVec(face: VoxelFace): Readonly<vec3> {
        return this.towards_vecs[face];
    }

    *getFaces(): IterableIterator<VoxelFace> {
        for (let i = 0; i < 6; i++) {
            yield i;
        }
    }
})();