import {vec3} from "gl-matrix";
import {ObjectPool} from "./objectPool";

export type VectorKey = string;
export type Sign = -1 | 1;

export const VecUtils = new (class {
    public readonly vec3_pool = new ObjectPool<vec3>(vec3.create, 10);

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

    getVectorKey(vec: vec3): VectorKey {
        return vec.toString();
    }
})();