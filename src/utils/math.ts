import {vec3} from "gl-matrix";

export type VectorKey = string;
export type Sign = -1 | 1;

export function validateVec(vec: Iterable<number>, validator: (v: number) => boolean) {
    for (const dim of vec) {
        if (!validator(dim))
            return false;
    }
    return true;
}

export function isIntVec(vec: Iterable<number>) {
    return validateVec(vec, Number.isInteger);
}

export function getVectorKey(vec: vec3): VectorKey {
    return vec.toString();
}