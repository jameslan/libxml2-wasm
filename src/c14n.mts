import {
    addFunction,
    removeFunction,
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
import { CStringArrayWrapper, XmlStringOutputBufferHandler } from './utils.mjs';
import type { XmlDocument } from './document.mjs';

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
export interface C14NOptionsBase {
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
}

export interface C14NOptionsWithCallback extends C14NOptionsBase {
    /** Custom callback to determine node visibility
     * Cannot be used together with nodeSet
     */
    isVisible: XmlC14NIsVisibleCallback;
    nodeSet?: never;
}

export interface C14NOptionsWithNodeSet extends C14NOptionsBase {
    /** Set of nodes to include in canonicalization
     * Cannot be used together with isVisible
     */
    nodeSet: Set<XmlNode>;
    isVisible?: never;
}

export type C14NOptions = C14NOptionsWithCallback | C14NOptionsWithNodeSet | C14NOptionsBase;

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
 * Wrap a JavaScript isVisible callback as a C function pointer.
 * Signature: int(void* user_data, xmlNodePtr node, xmlNodePtr parent)
 * @internal
 */
function wrapIsVisibleCallback(
    jsCallback: XmlC14NIsVisibleCallback,
    cascade: boolean = true,
): Pointer {
    // Track nodes made invisible to cascade invisibility to descendants when requested
    const invisible = cascade ? new Set<number>() : null;
    const wrapper = (
        _userDataPtr: number,
        nodePtr: number,
        parentPtr: number,
    ): number => {
        if (cascade && invisible) {
            if (parentPtr !== 0 && invisible.has(parentPtr)) {
                invisible.add(nodePtr);
                return 0;
            }
        }
        const res = jsCallback(nodePtr, parentPtr) ? 1 : 0;
        if (cascade && invisible && res === 0) invisible.add(nodePtr);
        return res;
    };
    return addFunction(wrapper, 'iiii') as Pointer;
}

/**
 * Convert a Set<XmlNode> to an isVisible callback
 * @internal
 */
function createNodeSetCallback(nodeSet: Set<XmlNode>): Pointer {
    const rootPtrs = new Set(Array.from(nodeSet).map((n) => n._nodePtr));
    const wrapper = (_userDataPtr_: number, nodePtr: number, parentPtr: number): number => {
        // Visible if node itself is a selected root, or it lies within any selected root subtree
        if (rootPtrs.has(nodePtr)) return 1;
        let cur = parentPtr;
        while (cur !== 0) {
            if (rootPtrs.has(cur)) return 1;
            cur = XmlTreeCommonStruct.parent(cur);
        }
        return 0;
    };
    return addFunction(wrapper, 'iiii') as Pointer;
}

/**
 * Internal implementation using xmlC14NExecute
 * @internal
 */
function canonicalizeInternal(
    handler: XmlOutputBufferHandler,
    docPtr: XmlDocPtr,
    options: C14NOptions = {},
    wrapCascade: boolean = true,
): void {
    const hasIsVisible = (opts: C14NOptions):
        opts is C14NOptions & { isVisible: XmlC14NIsVisibleCallback } => typeof (opts as any).isVisible === 'function';

    const hasNodeSet = (opts: C14NOptions):
        opts is C14NOptions & { nodeSet: Set<XmlNode> } => (opts as any).nodeSet instanceof Set;

    // Validate mutually exclusive options
    if (hasIsVisible(options) && hasNodeSet(options)) {
        throw new XmlError('Cannot specify both isVisible and nodeSet');
    }

    let outputBufferPtr: XmlOutputBufferPtr | null = null;
    let prefixArray: CStringArrayWrapper | null = null;
    let callbackPtr: Pointer = 0 as Pointer;

    try {
        // Create output buffer using IO callbacks
        outputBufferPtr = xmlOutputBufferCreateIO(handler);

        // Convert options to callback
        if (hasIsVisible(options)) {
            callbackPtr = wrapIsVisibleCallback(options.isVisible, wrapCascade);
        } else if (hasNodeSet(options)) {
            callbackPtr = createNodeSetCallback(options.nodeSet);
        }

        // Handle inclusive namespace prefixes
        if (options.inclusiveNamespacePrefixes) {
            prefixArray = new CStringArrayWrapper(options.inclusiveNamespacePrefixes);
        }

        const mode = options.mode ?? XmlC14NMode.XML_C14N_1_0;
        const withComments = options.withComments ? 1 : 0;

        const result = xmlC14NExecute(
            docPtr,
            callbackPtr,
            0, // user_data (not used in our callbacks)
            mode,
            prefixArray ? prefixArray._ptr : 0,
            withComments,
            outputBufferPtr,
        );

        if (result < 0) {
            throw new XmlError('Failed to canonicalize XML document');
        }
    } finally {
        if (prefixArray) {
            prefixArray.dispose();
        }
        if (outputBufferPtr) {
            xmlOutputBufferClose(outputBufferPtr);
        }
        if (callbackPtr !== 0) {
            removeFunction(callbackPtr);
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
 * Canonicalize an entire XML document and return as a string.
 *
 * @param doc The XML document to canonicalize
 * @param options Canonicalization options
 * @returns The canonical XML string
 *
 * @example
 * ```typescript
 * const canonical = canonicalizeDocumentToString(doc, {
 *   mode: XmlC14NMode.XML_C14N_1_0,
 *   withComments: false
 * });
 * ```
 */
export function canonicalizeDocumentToString(
    doc: XmlDocument,
    options: C14NOptions = {},
): string {
    const handler = new XmlStringOutputBufferHandler();
    canonicalizeDocument(handler, doc, options);
    return handler.result;
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
    options: C14NOptionsBase = {},
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

/**
 * Canonicalize a subtree of an XML document and return as a string.
 *
 * This is a convenience helper that creates an isVisible callback to filter
 * only nodes within the specified subtree.
 *
 * @param doc The document containing the subtree
 * @param subtreeRoot The root node of the subtree to canonicalize
 * @param options Canonicalization options (cannot include isVisible or nodeSet)
 * @returns The canonical XML string for the subtree
 *
 * @example
 * ```typescript
 * const element = doc.get('//my-element');
 * const canonical = canonicalizeSubtreeToString(doc, element!, {
 *   mode: XmlC14NMode.XML_C14N_EXCLUSIVE_1_0,
 *   inclusiveNamespacePrefixes: ['ns1', 'ns2'],
 *   withComments: false
 * });
 * ```
 */
export function canonicalizeSubtreeToString(
    doc: XmlDocument,
    subtreeRoot: XmlNode,
    options: C14NOptionsBase = {},
): string {
    const handler = new XmlStringOutputBufferHandler();
    canonicalizeSubtree(handler, doc, subtreeRoot, options);
    return handler.result;
}
