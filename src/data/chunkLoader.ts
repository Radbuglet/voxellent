import {vec2} from "gl-matrix";
import {Rect2} from "../utils/rect2";

// TODO: Implement
export class RectIterator {
    getNext(exclude_zone?: RectIterator): vec2 | null {
        throw "Not implemented";
    }
}

export class ChunkLoader {
    // Properties
    private done_unloading = true;
    private unloading_region = new RectIterator();
    private loading_region = new RectIterator();

    // Movement methods
    setRegion(rect: Rect2) {
        // TODO: Swap regions, set up their iteration states
        this.done_unloading = false;
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

        // The unloading region is only selecting (although not necessarily yielding) chunks we loaded before.
        // Therefore, we exclude this region from this region to ensure that we don't double-load a chunk.
        return this.loading_region.getNext(this.unloading_region);
    }
}