/**
 * Manage JS context object for wasm.
 *
 * In libxml2, a registration of callback often has a context/userdata pointer.
 * But when it is in wasm, this pointer is essentially an integer.
 *
 * To support JS object as context/userdata, we store it in the map and access with an integer key.
 * This key could be passed to the registration.
 * And the callback use this key to retrieve the real object.
 */
export class ContextStorage<T> {
    private allocator: () => T;

    private storage: Map<number, T> = new Map<number, T>();

    private index = 0;

    constructor(allocator: () => T) {
        this.allocator = allocator;
    }

    allocate(): number {
        this.index += 1;
        this.storage.set(this.index, this.allocator());
        return this.index;
    }

    free(index: number) {
        this.storage.delete(index);
    }

    get(index: number): T {
        return this.storage.get(index)!;
    }
}
