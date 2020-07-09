import {GlCtx} from "./aliases";

type IdealCapacityGetter = (required_length: number) => number;
type GpuSetElement = {
    index: number
    buffer: ArrayBuffer
};
export type ReadonlyGpuSetElement = Readonly<GpuSetElement>;

export class GpuSetBuffer {
    // Construction
    private readonly element_mirror: GpuSetElement[] = [];
    private gpu_write_index = 0;

    constructor(private readonly word_size: number, private length_capacity: number, public ideal_capacity_getter: IdealCapacityGetter) {
    }

    static withIdealCapacity(gl: GlCtx, word_size: number, ideal_capacity_getter: IdealCapacityGetter): { buffer: WebGLBuffer, manager: GpuSetBuffer } | null {
        const buffer = gl.createBuffer();
        if (buffer == null) return null;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        const capacity = ideal_capacity_getter(0);
        gl.bufferData(gl.ARRAY_BUFFER, word_size * capacity, gl.DYNAMIC_DRAW);
        return {
            buffer,
            manager: new GpuSetBuffer(word_size, capacity, ideal_capacity_getter)
        };
    }

    get length() {
        return this.element_mirror.length;
    }

    // Capacity management
    getCapacityDiscrepancy() {
        return Math.max(this.ideal_capacity_getter(this.element_mirror.length), this.element_mirror.length) - this.length_capacity;
    }

    resizeBuffer(gl: GlCtx, new_length: number = this.ideal_capacity_getter(this.element_mirror.length)) {
        // Ensure that the new length is not less than the current length
        new_length = Math.max(new_length, this.element_mirror.length);
        if (new_length == this.length_capacity)  // No operation needs to be performed.
            return true;  // Return stating it was a success

        // Regenerate a buffer that contains all old elements
        const buffer_data = new ArrayBuffer(new_length * this.word_size);
        const buffer_view = new Uint8Array(buffer_data);
        let offset = 0;
        for (const element of this.element_mirror) {
            const from_view = new Uint8Array(element.buffer);
            for (let i = 0; i < this.length_capacity; i++, offset++) {
                buffer_view[offset] = from_view[i];
            }
        }

        // Attempt to upload it to the GPU.
        try {
            gl.bufferData(gl.ARRAY_BUFFER, buffer_data, gl.DYNAMIC_DRAW);
            this.length_capacity = new_length;
            return true;
        } catch {
            return false;
        }
    }

    // Element management
    addElements(gl: GlCtx, buffer: ArrayBuffer, element_handler?: (element: ReadonlyGpuSetElement) => void): boolean {
        console.assert(buffer.byteLength % this.word_size == 0);

        // Update local mirror
        let copy_offset = 0;
        for (; copy_offset < buffer.byteLength; copy_offset += this.word_size) {
            const element = {
                index: this.element_mirror.length,
                buffer: buffer.slice(copy_offset, copy_offset + this.word_size)
            };
            element_handler && element_handler(element);
            this.element_mirror.push(element);
        }

        // If the new set exceeds the current capacity
        if (this.element_mirror.length > this.length_capacity) {
            // Resize the buffer to the ideal capacity. Since resizing reconstructs the GPU version of the buffer from the
            // element mirror, the elements will effectively be added to the set.
            if (this.resizeBuffer(gl)) {
                this.gpu_write_index += copy_offset;
                return true;
            }
            return false;
        } else {
            // Add the elements to the buffer using a subarray.
            gl.bufferSubData(gl.ARRAY_BUFFER, this.gpu_write_index, buffer);

            // Update the write_index
            this.gpu_write_index += copy_offset;

            // bufferSubData will not have any errors unless the GpuSetBuffer implementation is incorrect.
            return true;
        }
    }

    removeElement(gl: GlCtx, element: ReadonlyGpuSetElement) {
        const last_index = this.element_mirror.length - 1;
        const moved_element = this.element_mirror[last_index];

        // Update CPU mirror
        this.element_mirror[element.index] = moved_element;
        moved_element.index = element.index;
        this.element_mirror.splice(last_index, 1);  // Remove the other copy of the moved element

        // Update element on GPU
        gl.bufferSubData(gl.ARRAY_BUFFER, moved_element.index * this.word_size, moved_element.buffer);
    }

    setElement(gl: GlCtx, element: ReadonlyGpuSetElement, data: ArrayBuffer) {
        // Update CPU mirror
        (element as GpuSetElement).buffer = data;

        // Update element on GPU
        gl.bufferSubData(gl.ARRAY_BUFFER, element.index * this.word_size, data);
    }
}