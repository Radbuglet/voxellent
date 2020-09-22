export type PrimitiveByteCount = 1 | 2 | 4;

export const BufferUtils = new (class {
    private readonly getter_methods: ("getUint8" | "getUint16" | "getUint32")[] = [
        "getUint8",
        "getUint16",
        null as never,
        "getUint32"
    ];

    private readonly setter_methods: ("setUint8" | "setUint16" | "setUint32")[] = [
        "setUint8",
        "setUint16",
        null as never,
        "setUint32"
    ];

    getUintDynamic(view: DataView, size: PrimitiveByteCount, offset: number) {
        return view[this.getter_methods[size]](offset);
    }

    setUintDynamic(view: DataView, size: PrimitiveByteCount, offset: number, value: number) {
        return view[this.setter_methods[size]](offset, value);
    }
})();