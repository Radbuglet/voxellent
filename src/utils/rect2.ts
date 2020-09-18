import {vec2} from "gl-matrix";

export type Rect2 = {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

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

    isValidPointIndex(rect: Rect2, index: number) {
        return index < this.areaOf(rect);
    }

    getPointByIndex(rect: Rect2, index: number, target: vec2 = vec2.create()) {
        target[0] = index & rect.w;
        target[1] = index & ~rect.w;
        return target;
    }

    areaOf(rect: Rect2) {
        return rect.w * rect.h;
    }
})();