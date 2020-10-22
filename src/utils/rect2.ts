import {vec2} from "gl-matrix";

// This "gl-matrix"-like design is done to support third-party rect classes as most other implementations expose these properties.
export type MutableRect2 = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type Rect2 = Readonly<MutableRect2>;

export const Rect2 = new class {
    create(x: number = 0, y: number = 0, w: number = 0, h: number = 0): MutableRect2 {
        return { x, y, w, h };
    }

    copy(target: MutableRect2, from: Rect2) {
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

    getHorizontalEnd(rect: Rect2) {
        return rect.x + rect.w;
    }

    getVerticalEnd(rect: Rect2) {
        return rect.y + rect.h;
    }

    // Index conversions
    getXAtIndex(rect: Rect2, index: number) {
        return index % rect.w;
    }

    getYAtIndex(rect: Rect2, index: number) {
        return (index / rect.w) | 0;  // x | 0 => floor(x)
    }

    getPosAtIndex(rect: Rect2, index: number, target: vec2 = vec2.create()) {
        target[0] = this.getXAtIndex(rect, index);
        target[1] = this.getYAtIndex(rect, index);
        return target;
    }

    getIndexAtPosUnchecked(rect: Rect2, pos: Readonly<vec2>) {
        return pos[0] - rect.x +  // Horizontal component
            (pos[1] - rect.y) * rect.w;  // Vertical component
    }

    getIndexAtPosChecked(rect: Rect2, pos: Readonly<vec2>, max_index: number): number | null {
        const x_comp = pos[0] - rect.x;
        if (x_comp < 0 || x_comp >= rect.w) {
            return null;
        }

        const y_comp = pos[1] - rect.y;
        if (y_comp < 0) {
            return null;
        }

        const index = x_comp + rect.w * y_comp;
        return index < max_index ? index : null;
    }

    getIndicesUntilLineEndNoMax(rect: Rect2, x_pos: number): number {
        return Rect2.getHorizontalEnd(rect) - x_pos;
    }

    getIndicesUntilLineEnd(rect: Rect2, pos: Readonly<vec2>, max_index: number): number {
        return Math.min(
            this.getIndicesUntilLineEndNoMax(rect, pos[0]),  // Assuming we are not on the last line
            max_index - this.getIndexAtPosUnchecked(rect, pos) + 1  // Assuming we are on the last line.
            // Note: the +1 ensures interface consistency since this returns the number of indices to *wrap around*!
        );
    }
}();