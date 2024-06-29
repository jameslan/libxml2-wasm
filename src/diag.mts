/** @internal */
export interface MemTracker {
    trackAllocate(obj: Disposable): void;
    trackDeallocate(obj: Disposable): void;
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
    object: WeakRef<Disposable>;
    classname: string;
    callstack?: string;
}

function callstack(numSkip: number): string | undefined {
    const { stack } = new Error();
    if (!stack) return undefined;
    let pos = 0;
    // each line is one function call
    // remove two extract lines, error message and call to this function
    for (let i = numSkip + 2; i > 0; i -= 1) {
        pos = stack.indexOf('\n', pos) + 1;
    }
    return stack.substring(pos);
}

class MemTrackerImpl implements MemTracker {
    // js/ts doesn't have a builtin universal id for objects as in python,
    // we build a similar thing
    idCounter: number;

    // from object to id
    disposableId: WeakMap<Disposable, number>;

    // from id to tracking info
    disposableInfo: Map<number, MemTrackingInfo>;

    callerDetail: boolean;

    callerStats: boolean;

    constructor(callerDetail: boolean, callerStats: boolean) {
        this.callerDetail = callerDetail;
        this.callerStats = callerStats;
        this.idCounter = 0;
        this.disposableId = new WeakMap<Disposable, number>();
        this.disposableInfo = new Map<number, MemTrackingInfo>();
    }

    trackAllocate(obj: Disposable): void {
        this.idCounter += 1;
        this.disposableId.set(obj, this.idCounter);
        const info: MemTrackingInfo = {
            object: new WeakRef(obj),
            classname: obj.constructor.name,
        };
        if (this.callerDetail || this.callerStats) {
            info.callstack = callstack(2);
        }
        this.disposableInfo.set(this.idCounter, info);
    }

    trackDeallocate(obj: Disposable): void {
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
                const instanceInfo: any = { instance: obj };
                if (this.callerDetail) {
                    instanceInfo.caller = info.callstack;
                }
                classReport.instances.push(instanceInfo);
            } else {
                classReport.garbageCollected += 1;
            }
            if (this.callerStats) {
                const callers = (classReport.callers ||= {}); // eslint-disable-line no-multi-assign
                callers[info.callstack!] = (callers[info.callstack!] || 0) + 1;
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
    /**
     * Generate the statistics of point
     */
    callerStats?: boolean;
    /**
     * Record the callstack of creating each {@link disposable!XmlDisposable}.
     */
    callerDetail?: boolean;
}

/**
 * Set up memory diagnostic helpers.
 *
 * When enabled, it will record allocated {@link disposable!XmlDisposable} objects
 * (and its subclass objects) and track whether
 * {@link disposable!XmlDisposable#dispose} is called.
 *
 * Note that the allocation will not be monitored before memory diagnostics is enabled.
 *
 * @param options
 * @see {@link memReport}
 */
export function memDiag(options: MemDiagOptions) {
    if (options.enabled) {
        memTracker = new MemTrackerImpl(
            options.callerDetail === true,
            options.callerStats === true,
        );
    } else {
        memTracker = noopTracker;
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
    return memTracker.report();
}

let memTracker: MemTracker = noopTracker;

/** @internal */
export function tracker() : MemTracker {
    return memTracker;
}
