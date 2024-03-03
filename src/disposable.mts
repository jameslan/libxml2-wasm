import type { Pointer } from './libxml2raw';
import './disposeShim.mjs';
import './metadataShim.mjs';

export class XmlDisposable implements Disposable {
    dispose(): void {
        const metadata = (this.constructor as any)[Symbol.metadata];
        const propsToRelease = metadata[Symbol.dispose] as Array<string | symbol>;
        propsToRelease.forEach((prop) => { (this as any)[prop] = 0; });
    }

    /**
     * Dispose the object.
     *
     * It releases the managed resource and unregisters them from FinalizationRegistry.
     *
     * This needs to be called explicitly to avoid resource leak,
     * or use the object in `using` statement.
     *
     * @see {@link dispose}
     */
    [Symbol.dispose](): void {
        this.dispose();
    }
}

/**
 * Decorator of disposable accessor
 *
 * @param free
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
