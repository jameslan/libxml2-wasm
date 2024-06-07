import type { Pointer } from './libxml2raw';
import './disposeShim.mjs';
import './metadataShim.mjs';

interface MemTracker {
    trackAllocate(obj: XmlDisposable): void;
    trackDeallocate(obj: XmlDisposable): void;
    report(): any;
}

const noopTracker: MemTracker = {
    trackAllocate(): void {
    },

    trackDeallocate(): void {
    },

    report(): any {
    },
};

interface MemTrackingInfo {
    object: WeakRef<XmlDisposable>;
    classname: string;
}

class MemTrackerImpl implements MemTracker {
    // js/ts doesn't have a builtin universal id for objects as in python,
    // we build a similar thing
    idCounter: number;

    // from object to id
    disposableId: WeakMap<XmlDisposable, number>;

    // from id to tracking info
    disposableInfo: Map<number, MemTrackingInfo>;

    constructor() {
        this.idCounter = 0;
        this.disposableId = new WeakMap<XmlDisposable, number>();
        this.disposableInfo = new Map<number, MemTrackingInfo>();
    }

    trackAllocate(obj: XmlDisposable): void {
        this.idCounter += 1;
        this.disposableId.set(obj, this.idCounter);
        this.disposableInfo.set(this.idCounter, {
            object: new WeakRef(obj),
            classname: obj.constructor.name,
        });
    }

    trackDeallocate(obj: XmlDisposable): void {
        const id = this.disposableId.get(obj);
        if (id) { // the object may be created before the diagnosis enabled
            this.disposableInfo.delete(id);
            this.disposableId.delete(obj);
        }
    }

    report(): any {
        const report: any = {};
        this.disposableInfo.forEach((info) => {
            const classReport = report[info.classname] ||= { // eslint-disable-line no-multi-assign
                garbageCollected: 0,
                totalInstances: 0,
                instances: [],
            };
            classReport.totalInstances += 1;
            const obj = info.object.deref();
            if (obj != null) {
                classReport.instances.push({ instance: obj });
            } else {
                classReport.garbageCollected += 1;
            }
        });
        return report;
    }
}

/**
 * Memory Diagnostic options.
 */
export interface MemDiagOptions {
    /**
     * Enabling the memory diagnostics.
     * Note the tracking information will be lost when it is disabled.
     */
    enabled: boolean;
}

/**
 * Set up memory diagnostic helpers.
 *
 * When enabled, it will record allocated {@link XmlDisposable} objects
 * (and its subclass objects) and track if
 * {@link XmlDisposable#dispose} is called.
 *
 * Note that the allocation will not be monitored before memory diagnostics is enabled.
 *
 * @param options
 * @see {@link memReport}
 */
export function memDiag(options: MemDiagOptions) {
    if (options.enabled) {
        tracker = new MemTrackerImpl();
    } else {
        tracker = noopTracker;
    }
}

/**
 * Get the report of un-disposed objects.
 * @returns The report (JSON) object, whose format may vary according to the settings,
 * and is subject to change.
 * Returns undefined if memory diagnostic is not enabled.
 * @see {@link memDiag}
 */
export function memReport(): any {
    return tracker.report();
}

let tracker: MemTracker = noopTracker;

/**
 * Base implementation of interface Disposable to handle wasm memory.
 *
 * Remember to call `dispose()` for any subclass object.
 */
export abstract class XmlDisposable implements Disposable {
    protected constructor() {
        tracker.trackAllocate(this);
    }

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
        tracker.trackDeallocate(this);
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
export function disposeBy<This extends XmlDisposable>(free: (value: Pointer) => void) {
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
