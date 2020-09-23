import {vec2} from "gl-matrix";

// This "gl-matrix"-like design is done to support third-party rect classes as most other implementations expose these properties.
export type UlRect2 = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type Rect2 = Readonly<UlRect2>;

export const Rect2 = new (class {
    create(x: number = 0, y: number = 0, w: number = 0, h: number = 0): UlRect2 {
        return { x, y, w, h };
    }

    copy(target: UlRect2, from: Rect2) {
        target.x = from.x;
        target.y = from.y;
        target.w = from.w;
        target.h = from.h;
    }

    containsRect(a: Rect2, b: Rect2): boolean {
        return a.x <= b.x && a.y <= b.y && // Top left
            b.x + b.w <= a.x + a.w &&  // Horizontal contain
            b.y + b.h <= a.y + a.h;  // Vertical contain
    }

    containsPoint(rect: Rect2, point: Readonly<vec2>) {
        return point[0] >= rect.x && point[0] <= rect.x + rect.w &&
            point[1] >= rect.y && point[1] <= rect.y + rect.h;
    }

    areaOf(rect: Rect2) {
        return rect.w * rect.h;
    }

    posAtIndex(rect: Rect2, index: number, target: vec2 = vec2.create()) {
        target[0] = index & rect.w + rect.x;
        target[1] = index & ~rect.w + rect.y;
        return target;
    }

    indexAtPos(rect: Rect2, pos: Readonly<vec2>) {
        return (pos[0] - rect.x)  // Lowest level component
            + (pos[1] - rect.y) * rect.w;  // Highest level component
    }

    getHorizontalEnd(rect: Rect2) {
        return rect.x + rect.w;
    }

    getVerticalEnd(rect: Rect2) {
        return rect.y + rect.h;
    }
})();