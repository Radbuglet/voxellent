import {vec2} from "gl-matrix";
import {Rect2} from "../utils/rect2";

export class RectIterator {
    public readonly rect = Rect2.create();
    public index = 0;
    public max_index = 0;

    setArea(rect: Rect2) {
        Rect2.copy(this.rect, rect);
        this.index = 0;
        this.max_index = rect.w * rect.h;
    }

    // Iterator querying
    private hasInvalidIndex() {
        return this.index < this.max_index;
    }

    private getPoint(index: number, target: vec2 = vec2.create()): vec2 {
        return Rect2.posAtIndex(this.rect, index, target);
    }

    private isInsideSpan(point: vec2): boolean {
        throw "Not implemented";  // TODO
    }

    private exitTheExclusionZone(exclude_zone: RectIterator, target: vec2 = vec2.create()) {
        // Can skip past the zone and stay on the same line?
        if (todo) {
            // Skip to the end of the region.
            // TODO
            return;
        }

        // Does the line only cover the right half of the line?
        if (todo) {
            // Skip to the beginning of the next line.
            // TODO
            return;
        }

        // Since we know that the zone covers the entire line, skip to the last point of the exclusion zone.
        // TODO

        // Can we put ourselves back in our region?
        if (todo) {
            // Go to the next closest point to the last point of the exclusion zone.
            // TODO
            return;
        }

        // Otherwise, we couldn't skip over the exclude region to a point in our region. :(
        this.index = this.max_index;
        return;
    }

    getNext(exclude_zone?: RectIterator, target: vec2 = vec2.create()): vec2 | null {
        // Short-circuit if we're done loading.
        if (!this.hasInvalidIndex()) return null;

        // Get position of this index
        this.getPoint(this.index, target);

        // Check if we're in the exclusion zone
        if (exclude_zone != null && exclude_zone.isInsideSpan(target)) {
            // Try to escape it.
            this.exitTheExclusionZone(exclude_zone, target);

            // Ensure that our index is still valid.
            if (this.hasInvalidIndex()) {
                return null;
            }
        }

        // Move to the next index
        this.index++;

        // Return the next target point.
        return target;
    }
}

export class ChunkLoader {
    // Properties
    private done_unloading = true;
    private unloading_region = new RectIterator();
    private loading_region = new RectIterator();

    // Movement methods
    setRegion(rect: Rect2) {
        if (this.done_unloading) {  // All regions are changed if we finished unloading the chunks.
            // >> Swap regions
            // The previous unloading region can be used as the loading region because it is no longer in use.
            const loading_region = this.unloading_region;
            this.unloading_region = this.loading_region;
            this.loading_region = loading_region;

            // >> Turn the loading region into the unloading region.
            // The unloading region is guaranteed to contain all actively loaded chunks if we have finished loading the region.
            // Thus, we don't leak any chunks.
            this.unloading_region.max_index = this.unloading_region.index;
            this.unloading_region.index = 0;

            // >> Modify the area of the new loading region
            loading_region.setArea(rect);

            // >> Mark that we're not done loading to force the user to query and handle any unloading tasks
            this.done_unloading = false;
        } else {
            // >> Just change the loading region.
            this.loading_region.setArea(rect);
        }
    }

    // Task querying
    getNextUnloadingTask(): vec2 | null {
        // The unloading region is only selecting chunks we loaded before. These chunks might still
        // need to be loaded which is why we exclude the loading_region.
        const next_task = this.unloading_region.getNext(this.loading_region);
        if (next_task == null) {
            this.done_unloading = true;
        }
        return next_task;
    }

    getNextLoadingTask(): vec2 | null {
        console.assert(this.done_unloading);

        // The unloading region is only selecting (although not necessarily yielding) chunks we loaded in the previous iteration.
        // Therefore, we exclude this region from this region to ensure that we don't double-load a chunk.
        return this.loading_region.getNext(this.unloading_region);
    }
}