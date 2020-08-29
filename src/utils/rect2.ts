export interface Rect2 {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}

export const RectUtils = new (class {
    contains(a: Rect2, b: Rect2): boolean {
        return a.x <= b.x && a.y <= b.y && // Top left
            b.x + b.w <= a.x + a.w &&  // Horizontal contain
            b.y + b.h <= a.y + a.h;  // Vertical contain
    }
})();