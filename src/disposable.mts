import type { Pointer } from './libxml2raw.cjs';
import './disposeShim.mjs';
import './metadataShim.mjs';
import { tracker } from './diag.mjs';

const symXmlDisposableInternal = Symbol('XmlDisposableInternal');

interface XmlDisposableConstructor<T extends XmlDisposable<T>> {
    new (ptr: Pointer, ...args: any[]): T;
}

interface XmlDisposableInternal<T extends XmlDisposable<T>> {
    instances: Map<Pointer, WeakRef<T>>;
    finalization: FinalizationRegistry<Pointer>;
    free: (ptr: Pointer) => void;
}

/** @internal */
export function disposeBy<T extends XmlDisposable<T>>(free: (value: Pointer) => void) {
    return function decorator(
        target: XmlDisposableConstructor<T>,
        context: ClassDecoratorContext,
    ) {
        context.metadata[symXmlDisposableInternal] = {
            instances: new Map<Pointer, WeakRef<T>>(),
            finalization: new FinalizationRegistry(free),
            free,
        };
    };
}

/**
 * Base implementation of interface Disposable to handle wasm memory.
 *
 * Remember to call `dispose()` for any subclass object.
 *
 * @template T The subclass deriving from XmlDisposable.
 */
export abstract class XmlDisposable<T extends XmlDisposable<T>> implements Disposable {
    /** @internal */
    _ptr: Pointer;

    /** @internal */
    constructor(ptr: Pointer) {
        this._ptr = ptr;
        tracker().trackAllocate(this);
    }

    /**
     * Alias of {@link "[dispose]"}.
     *
     * @see {@link "[dispose]"}
     */
    dispose(): void {
        this[Symbol.dispose]();
    }

    /**
     * Dispose the object.
     *
     * It releases the managed resource and unregisters them from FinalizationRegistry.
     * So the release of the managed resource won't need to wait until
     * this object is garbage collected.
     *
     * This needs to be called explicitly to avoid resource leak,
     * or declare the object with `using` declaration.
     *
     * @see {@link dispose}
     */
    [Symbol.dispose](): void {
        if (this._ptr === 0) return; // already disposed

        const metadata = (this.constructor as any)[Symbol.metadata];
        const internal: XmlDisposableInternal<T> = metadata[symXmlDisposableInternal];
        internal.free(this._ptr);
        // already freed, remove from finalization registry
        internal.finalization.unregister(this);
        // remove from instances registry
        internal.instances.delete(this._ptr);
        tracker().trackDeallocate(this);
        this._ptr = 0;
    }

    /** @internal */
    static getInstance<U extends XmlDisposable<U>>(
        this: XmlDisposableConstructor<U>,
        ptr: Pointer,
        ...args: any[]
    ): U {
        const metadata = (this as any)[Symbol.metadata];
        const internal: XmlDisposableInternal<U> = metadata[symXmlDisposableInternal];
        const instRef = internal.instances.get(ptr);
        if (instRef) {
            const inst = instRef.deref();
            if (inst) {
                return inst;
            }
        }
        const newInst = new this(ptr, ...args);
        internal.instances.set(ptr, new WeakRef(newInst));
        internal.finalization.register(newInst, ptr, newInst);
        return newInst;
    }
}
