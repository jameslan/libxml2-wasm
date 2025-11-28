import {
    addFunction,
    allocCStringArray,
    free,
    xmlC14NExecute,
    xmlOutputBufferCreateIO,
    xmlOutputBufferClose,
    XmlError,
    XmlOutputBufferHandler,
    XmlTreeCommonStruct,
} from './libxml2.mjs';
import type { XmlNode } from './nodes.mjs';
import type {
    XmlDocPtr, XmlOutputBufferPtr, Pointer, XmlNodePtr,
} from './libxml2raw.mjs';
import type { XmlDocument } from './document.mjs';
import { ContextStorage } from './utils.mjs';

/**
 * Context for the C14N isVisible callback.
 * @internal
 */
interface C14NCallbackContext {
    /** The JS callback to invoke, or null if using nodeSet mode */
    jsCallback: XmlC14NIsVisibleCallback | null;
    /** For nodeSet mode: set of root pointers to check against */
    rootPtrs: Set<number> | null;
    /** Whether to cascade invisibility to descendants */
    cascade: boolean;
    /** Tracks nodes made invisible (for cascade mode) */
    invisible: Set<number> | null;
}

const c14nCallbackStorage = new ContextStorage<C14NCallbackContext>();

/**
 * Global C14N visibility callback - created once at module initialization.
 * Signature: int(void* user_data, xmlNodePtr node, xmlNodePtr parent)
 * @internal
 */
const c14nIsVisibleCallback = addFunction(
    (userDataIndex: number, nodePtr: number, parentPtr: number): number => {
        const ctx = c14nCallbackStorage.get(userDataIndex);

        // Handle nodeSet mode
        if (ctx.rootPtrs !== null) {
            // Visible if node is a selected root, or lies within any selected root subtree
            if (ctx.rootPtrs.has(nodePtr)) return 1;
            let cur = parentPtr;
            while (cur !== 0) {
                if (ctx.rootPtrs.has(cur)) return 1;
                cur = XmlTreeCommonStruct.parent(cur);
            }
            return 0;
        }

        // Handle isVisible callback mode
        if (ctx.jsCallback !== null) {
            // Cascade invisibility check
            if (ctx.cascade && ctx.invisible) {
                if (parentPtr !== 0 && ctx.invisible.has(parentPtr)) {
                    ctx.invisible.add(nodePtr);
                    return 0;
                }
            }
            const res = ctx.jsCallback(nodePtr, parentPtr) ? 1 : 0;
            if (ctx.cascade && ctx.invisible && res === 0) {
                ctx.invisible.add(nodePtr);
            }
            return res;
        }
        /* c8 ignore next 2, callback is not registered if neither is present */
        return 1;
    },
    'iiii',
) as Pointer;

/**
 * C14N (Canonical XML) modes supported by libxml2
 * @see http://www.w3.org/TR/xml-c14n
 * @see http://www.w3.org/TR/xml-exc-c14n
 */
export const XmlC14NMode = {
    /** Original C14N 1.0 specification */
    XML_C14N_1_0: 0,
    /** Exclusive C14N 1.0 (omits unused namespace declarations) */
    XML_C14N_EXCLUSIVE_1_0: 1,
    /** C14N 1.1 specification */
    XML_C14N_1_1: 2,
} as const;

/**
 * Callback to determine if a node should be included in canonicalization.
 *
 * @param node The node being evaluated
 * @param parent The parent of the node being evaluated
 * @returns true if the node should be included, false otherwise
 */
export type XmlC14NIsVisibleCallback = (node: XmlNodePtr, parent: XmlNodePtr) => boolean;

/**
 * Options for XML canonicalization
 */
export interface C14NOptions {
    /** The canonicalization mode to use
     * @default XmlC14NMode.XML_C14N_1_0
     */
    mode?: typeof XmlC14NMode[keyof typeof XmlC14NMode];

    /** Whether to include comments in the canonicalized output
     * @default false
     */
    withComments?: boolean;

    /** List of inclusive namespace prefixes for exclusive canonicalization
     * Only applies when mode is XML_C14N_EXCLUSIVE_1_0
     */
    inclusiveNamespacePrefixes?: string[];

    /** Custom callback to determine node visibility
     * Must not be used together with {@link nodeSet}
     */
    isVisible?: XmlC14NIsVisibleCallback;

    /** Set of nodes to include in canonicalization
     * Must not be used together with {@link isVisible}
     */
    nodeSet?: Set<XmlNode>;
}

/**
 * C14N options without filtering callbacks (for subtree canonicalization)
 */
export type SubtreeC14NOptions = Omit<C14NOptions, 'isVisible' | 'nodeSet'>;

/**
 * Check if a node is within a subtree rooted at a specific node by walking
 * up the parent chain using the libxml-provided parent pointer.
 *
 * Important: Namespace declaration nodes (xmlNs) are not part of the tree and
 * don't have a normal parent field. libxml2 calls the visibility callback with
 * the owning element as `parentPtr`, so we must start walking from `parentPtr`
 * rather than dereferencing the node.
 * @internal
 */
function isNodeInSubtree(nodePtr: number, parentPtr: number, rootPtr: number): boolean {
    if (nodePtr === rootPtr) {
        return true;
    }
    let currentPtr = parentPtr;
    while (currentPtr !== 0) {
        if (currentPtr === rootPtr) {
            return true;
        }
        currentPtr = XmlTreeCommonStruct.parent(currentPtr);
    }
    return false;
}

/**
 * Internal implementation using xmlC14NExecute
 * @internal
 */
function canonicalizeInternal(
    handler: XmlOutputBufferHandler,
    docPtr: XmlDocPtr,
    options: C14NOptions = {},
    cascade: boolean = true,
): void {
    const hasIsVisible = (opts: C14NOptions):
        opts is C14NOptions & {
            isVisible: XmlC14NIsVisibleCallback
        } => typeof (opts as any).isVisible === 'function';

    const hasNodeSet = (opts: C14NOptions):
        opts is C14NOptions & { nodeSet: Set<XmlNode> } => (opts as any).nodeSet instanceof Set;

    // Validate mutually exclusive options
    if (hasIsVisible(options) && hasNodeSet(options)) {
        throw new XmlError('Cannot specify both isVisible and nodeSet');
    }

    let outputBufferPtr: XmlOutputBufferPtr | null = null;
    let prefixArrayPtr: Pointer = 0;
    let contextIndex: number = 0;

    try {
        // Create output buffer using IO callbacks
        outputBufferPtr = xmlOutputBufferCreateIO(handler);

        // Build callback context based on options
        if (hasIsVisible(options) || hasNodeSet(options)) {
            const context: C14NCallbackContext = {
                jsCallback: hasIsVisible(options) ? options.isVisible : null,
                rootPtrs: hasNodeSet(options)
                    ? new Set(Array.from(options.nodeSet)
                        .map((n) => n._nodePtr))
                    : null,
                cascade,
                invisible: cascade ? new Set<number>() : null,
            };
            contextIndex = c14nCallbackStorage.allocate(context);
        }

        // Handle inclusive namespace prefixes
        if (options.inclusiveNamespacePrefixes) {
            prefixArrayPtr = allocCStringArray(options.inclusiveNamespacePrefixes);
        }

        const mode = options.mode ?? XmlC14NMode.XML_C14N_1_0;
        const withComments = options.withComments ? 1 : 0;

        const result = xmlC14NExecute(
            docPtr,
            contextIndex !== 0 ? c14nIsVisibleCallback : 0 as Pointer,
            contextIndex, // user_data is the storage index
            mode,
            prefixArrayPtr,
            withComments,
            outputBufferPtr,
        );

        /* c8 ignore next 3, defensive code */
        if (result < 0) {
            throw new XmlError('Failed to canonicalize XML document');
        }
    } finally {
        if (prefixArrayPtr) free(prefixArrayPtr);
        if (outputBufferPtr) {
            xmlOutputBufferClose(outputBufferPtr);
        }
        if (contextIndex !== 0) {
            c14nCallbackStorage.free(contextIndex);
        }
    }
}

/**
 * Canonicalize an entire XML document to a buffer and invoke callbacks to process.
 *

 * @param handler Callback to receive the canonicalized output
 * @param doc The XML document to canonicalize
 * @param options Canonicalization options
 *
 * @example
 * ```typescript
 * const handler = new XmlStringOutputBufferHandler();
 * canonicalizeDocument(handler, doc, {
 *   mode: XmlC14NMode.XML_C14N_1_0,
 *   withComments: false
 * });
 * ```
 */
export function canonicalizeDocument(
    handler: XmlOutputBufferHandler,
    doc: XmlDocument,
    options: C14NOptions = {},
): void {
    canonicalizeInternal(handler, doc._ptr, options);
}

/**
 * Canonicalize a subtree of an XML document to a buffer and invoke callbacks to process.
 *
 * This is a convenience helper that creates an isVisible callback to filter
 * only nodes within the specified subtree.
 *
 * @param handler Callback to receive the canonicalized output
 * @param doc The document containing the subtree
 * @param subtreeRoot The root node of the subtree to canonicalize
 * @param options Canonicalization options (cannot include isVisible or nodeSet)
 *
 * @example
 * ```typescript
 * const element = doc.get('//my-element');
 * const handler = new XmlStringOutputBufferHandler();
 * canonicalizeSubtree(handler, doc, element!, {
 *   mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
 *   inclusiveNamespacePrefixes: ['ns1', 'ns2'],
 *   withComments: false
 * });
 * ```
 */
export function canonicalizeSubtree(
    handler: XmlOutputBufferHandler,
    doc: XmlDocument,
    subtreeRoot: XmlNode,
    options: SubtreeC14NOptions = {},
): void {
    const subtreeRootPtr = subtreeRoot._nodePtr;
    const isVisible = (nodePtr: number, parentPtr: number) => (
        isNodeInSubtree(nodePtr, parentPtr, subtreeRootPtr)
    );
    // Use non-cascading behavior for subtree helper
    canonicalizeInternal(handler, doc._ptr, {
        ...options,
        isVisible: isVisible as unknown as XmlC14NIsVisibleCallback,
    }, /* wrapCascade */ false);
}
