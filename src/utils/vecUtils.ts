import {vec3} from "gl-matrix";

export type VectorKey = string;
export type Sign = -1 | 1;
export type MutableArrayLike<T> = { [key: number]: T };

export const VecUtils = new class {
    public readonly work_vec = vec3.create();

    validateVec(vec: Iterable<number>, validator: (v: number) => boolean) {
        for (const dim of vec) {
            if (!validator(dim))
                return false;
        }
        return true;
    }

    isIntVec(vec: Iterable<number>) {
        return this.validateVec(vec, Number.isInteger);
    }

    getVectorKey(vec: Readonly<vec3>): VectorKey {
        return vec.toString();
    }
}();