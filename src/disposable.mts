import type { Pointer } from './libxml2raw';
import './disposeShim.mjs';
import './metadataShim.mjs';

/**
 * Base implementation of interface Disposable to handle wasm memory.
 *
 * Remember to call `dispose()` for any subclass object.
 */
export abstract class XmlDisposable implements Disposable {
    /**
     * Alias of {@link "[dispose]"}.
     *
     * @see {@link "[dispose]"}
     * @see {@link disposeBy}
     */
    dispose(): void {
        const metadata = (this.constructor as any)[Symbol.metadata];
        const propsToRelease = metadata[Symbol.dispose] as Array<string | symbol>;
        propsToRelease.forEach((prop) => { (this as any)[prop] = 0; });
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
     * @see {@link disposeBy}
     */
    [Symbol.dispose](): void {
        this.dispose();
    }
}

/**
 * Decorator factory of disposable accessor
 *
 * @param free function to release the managed wasm resource
 * @returns the decorator
 */
export function disposeBy<This extends object>(free: (value: Pointer) => void) {
    return function decorator(
        target: ClassAccessorDecoratorTarget<This, Pointer>,
        ctx: ClassAccessorDecoratorContext<This, Pointer>,
    ): ClassAccessorDecoratorResult<This, Pointer> {
        const registry = new FinalizationRegistry(free);
        ctx.metadata[Symbol.dispose] ??= [];
        (ctx.metadata[Symbol.dispose] as Array<string | symbol>).push(ctx.name);
        return {
            set(value: Pointer) {
                const prev = target.get.call(this);
                if (prev) {
                    free(prev);
                    registry.unregister(this);
                }
                target.set.call(this, value);
                if (value) {
                    registry.register(this, value, this);
                }
            },
        };
    };
}
