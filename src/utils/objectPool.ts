export class ObjectPool<T> {
    private readonly pool: T[] = [];
    private pool_size = 32;

    constructor(public readonly ctor: () => T, public readonly capacity: number) {
        while (this.pool.length < this.capacity) {
            this.pool.push(ctor());
        }
    }

    obtain(): T {
        return this.pool.pop() || this.ctor();
    }

    release(instance: T) {
        if (this.pool.length < this.pool_size)
            this.pool.push(instance);
    }
}