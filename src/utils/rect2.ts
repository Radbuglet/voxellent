import {vec2} from "gl-matrix";

export type UlRect2 = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type Rect2 = Readonly<UlRect2>;

export const RectUtils = new (class {
    containsRect(a: Rect2, b: Rect2): boolean {
        return a.x <= b.x && a.y <= b.y && // Top left
            b.x + b.w <= a.x + a.w &&  // Horizontal contain
            b.y + b.h <= a.y + a.h;  // Vertical contain
    }

    containsPoint(rect: Rect2, point: vec2) {
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
})();