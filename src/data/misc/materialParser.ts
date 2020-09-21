type ViewConstructor<TView> = new(buffer?: ArrayBuffer) => TView;

export interface IMaterialView {
    setTargetBuffer(buffer?: ArrayBuffer): void;
}

export class MaterialParser<TView extends IMaterialView> {
    private readonly materials: ViewConstructor<TView>[] = [];

    constructor(private readonly flag_size: 8 | 16 | 32) {}

    register(type: ViewConstructor<TView>): number {
        this.materials.push(type);
        return this.materials.length - 1;
    }

    setMaterialId(buffer: ArrayBuffer, material: number) {
        new DataView(buffer)[("setUint" + this.flag_size) as "setUint8"](0, material);
    }

    getMaterialId(buffer: ArrayBuffer): number {
        return new DataView(buffer)[("getUint" + this.flag_size) as "getUint8"](0);
    }

    getMaterialViewType(buffer: ArrayBuffer): ViewConstructor<TView> | undefined {
        return this.materials[this.getMaterialId(buffer)];
    }

    getMaterialView(buffer: ArrayBuffer) {
        const type = this.getMaterialViewType(buffer);
        return type === undefined ? undefined : new type(buffer);
    }
}