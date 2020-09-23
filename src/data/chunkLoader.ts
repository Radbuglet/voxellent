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

    // TODO: Check for off-by-one errors
    private exitTheExclusionZone(exclude_zone: RectIterator, target: vec2 = vec2.create()): boolean {
        const our_x_end = Rect2.getHorizontalEnd(this.rect);
        const exclzone_x_end = Rect2.getHorizontalEnd(exclude_zone.rect);

        // Can skip past the zone and stay on the same line?
        const dist_until_own_end_niv = our_x_end - target[0];
        const dist_until_exclzone_end = Math.min(
            exclude_zone.max_index - exclude_zone.index,  // Assuming we are the last line
            exclzone_x_end - target[0]  // Assuming we are not the last line
        );

        if (dist_until_exclzone_end <= dist_until_own_end_niv) {
            // Skip to the end of the region.
            this.index += dist_until_exclzone_end;

            // Are we still in the region?
            if (this.hasInvalidIndex()) return false;

            // Recalculate target and return success
            this.getPoint(this.index, target);
            return true;
        }

        // Does the line only cover the right half of the line?
        if (target[0] < exclude_zone.rect.x) {
            // Skip to the beginning of the next line.
            this.index += dist_until_own_end_niv;

            // Are we still in the region?
            if (this.hasInvalidIndex()) return false;

            // Recalculate target and return success
            this.getPoint(this.index, target);
            return true;
        }

        // Since we know that the zone covers the entire line, skip to the last point of the exclusion zone.
        exclude_zone.getPoint(exclude_zone.max_index, target);

        // Is this point to the left of the x_end?
        if (target[0] <= our_x_end) {
            // Skip to either the beginning of the line or the equivalent point
            target[0] = Math.max(this.rect.x, target[0]);
            this.index = Rect2.indexAtPos(this.rect, target);

            // Our target pos and index are aligned. All we have to do is check for index validity.
            return !this.hasInvalidIndex();
        }

        // Our point is to the right of the x_end. Move to the beginning of the next line.
        target[0] = this.rect.x;
        target[1]++;
        this.index = Rect2.indexAtPos(this.rect, target);

        // Check validity
        if (this.hasInvalidIndex()) {
            // We couldn't skip over the exclude region to a point in our region. Return failure.
            this.index = this.max_index;
            return false;
        } else {
            // Recalculate target and return success
            this.getPoint(this.index, target);
            return true;
        }
    }

    getNext(exclude_zone?: RectIterator, target: vec2 = vec2.create()): vec2 | null {
        // Short-circuit if we're done loading.
        if (!this.hasInvalidIndex()) return null;

        // Get position of this index.
        this.getPoint(this.index, target);

        // Ensure that we're not in the exclusion zone.
        if (
            exclude_zone != null && exclude_zone.isInsideSpan(target) &&  // Are we in the exclusion zone?
            !this.exitTheExclusionZone(exclude_zone, target)  // Has our attempt to exit it failed?
        ) {
            return null;  // We failed to reenter the region. There are no more points to return.
        }

        // Move to the next index.
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