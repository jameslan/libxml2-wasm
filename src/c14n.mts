import {
    addFunction,
    getValue, DisposableMalloc,
    UTF8ToString, xmlC14NDocDumpMemory, xmlC14NExecute, xmlCopyNode,
    xmlDocSetRootElement,
    XmlError,
    xmlFree,
    xmlFreeDoc,
    xmlNewDoc,
    xmlNewNs,
    XmlOutputBufferHandler, DisposableXmlOutputBuffer, ContextStorage,
} from './libxml2.mjs';
import { createNode, XmlElement, type XmlNode } from './nodes.mjs';
import type { XmlDocPtr } from './libxml2raw.mjs';
import {
    CStringArrayWrapper, XmlNodeSetWrapper,
} from './utils.mjs';
import { Pointer } from './libxml2raw.mjs';

export const XmlC14NMode = {
    XML_C14N_1_0: 0,
    XML_C14N_EXCLUSIVE_1_0: 1,
    XML_C14N_1_1: 2,
} as const;

export type C14NOptionsBase = {
    /** The canonicalization mode to use
     * @see {@link XmlC14NMode}
     */
    mode: typeof XmlC14NMode[keyof typeof XmlC14NMode];
    /** The list of inclusive namespace prefixes (only for exclusive canonicalization) */
    inclusiveNamespacePrefixList?: string[];
    /** Whether to include comments in the canonicalized output
     * @default false
     */
    withComments?: boolean;
};

export type C14NOptionsDocument = C14NOptionsBase & {
    node?: never;
    nodeSet?: never;
    isVisibleCallback?: never;
    userData?: never;
};

export type C14NOptionsNode = C14NOptionsBase & {
    node: XmlNode;
    nodeSet?: never;
    isVisibleCallback?: never;
    userData?: never;
};

export type C14NOptionsNodeSet = C14NOptionsBase & {
    nodeSet: XmlNode[];
    node?: never;
    isVisibleCallback?: never;
    userData?: never;
};

export type C14NOptionsCallback<T> = C14NOptionsBase & {
    node?: never;
    nodeSet?: never;
    isVisibleCallback: XmlC14NIsVisibleCallback<T>;
    userData?: T;
};

export type C14NOptions<T = unknown> =
    C14NOptionsDocument | C14NOptionsNode | C14NOptionsNodeSet | C14NOptionsCallback<T>;

/**
 * Decide if a node should be included in the canonicalization.
 */
export type XmlC14NIsVisibleCallback<T> = (userData: T, node: XmlNode, parent: XmlNode) => boolean;

/**
 * wrap the users is visible function
 */
export function getC14NIsVisibleCallback<T>(
    cb: XmlC14NIsVisibleCallback<T>,
    contextStorage: ContextStorage<T> | null,
): Pointer {
    const wrapper = (userDataPtr: number, nodePtr: number, parentPtr: number): number => {
        const node = createNode(nodePtr);
        const parent = createNode(parentPtr);
        const userDataObj = contextStorage ? contextStorage.get(userDataPtr) : undefined;
        return cb(userDataObj as T, node, parent) ? 1 : 0;
    };
    const funcPtr = addFunction(wrapper, 'iiii');
    return funcPtr as Pointer;
}

/**
 * Canonicalize an XML document with a specific node
 */
export function canonicalizeWithNode(
    docPtr: XmlDocPtr,
    handler: XmlOutputBufferHandler,
    options: C14NOptionsNode,
): void {
    using docTxtMem = new DisposableMalloc(4);
    let tempDoc: number | null = null;
    let prefixArray: CStringArrayWrapper | null = null;

    try {
        // If inclusiveNamespaces is provided
        if (options.inclusiveNamespacePrefixList) {
            prefixArray = new CStringArrayWrapper(options.inclusiveNamespacePrefixList);
        }

        // Create a temporary document for the subtree
        tempDoc = xmlNewDoc();
        if (!tempDoc) {
            throw new XmlError('Failed to create new document for subtree');
        }

        // Make a deep copy of the node (1 = recursive copy)
        const copiedNode = xmlCopyNode(options.node._nodePtr, 1);
        if (!copiedNode) {
            throw new XmlError('Failed to copy subtree node');
        }

        // Set the copied node as the root element of the new document
        xmlDocSetRootElement(tempDoc, copiedNode);

        // If inclusiveNamespaces is provided,
        // we need to add the namespace declarations to the root element
        const inclusivePrefixes = options.inclusiveNamespacePrefixList;
        if (inclusivePrefixes) {
            let currentNode: XmlElement | null = options.node.parent;
            while (currentNode) {
                Object.entries(currentNode.nsDeclarations).forEach(
                    ([prefix, namespaceURI]) => {
                        if (inclusivePrefixes.includes(prefix)) {
                            const namespace = xmlNewNs(copiedNode, namespaceURI, prefix);
                            if (!namespace) {
                                throw new XmlError(`Failed to add namespace declaration "${prefix}"`);
                            }
                        }
                    },
                );
                currentNode = currentNode.parent;
            }
        }

        const mode = options.mode ?? XmlC14NMode.XML_C14N_1_0;
        const withComments = options.withComments ? 1 : 0;

        const result = xmlC14NDocDumpMemory(
            tempDoc,
            0, // no nodeSet for single node
            mode,
            prefixArray ? prefixArray._ptr : 0,
            withComments,
            docTxtMem._ptr,
        );

        if (result < 0) {
            throw new XmlError('Failed to canonicalize XML subtree');
        }

        const txtPtr = getValue(docTxtMem._ptr, 'i32');
        if (!txtPtr) throw new XmlError('Failed to get canonicalized XML');

        const canonicalXml = UTF8ToString(txtPtr, result);
        const buffer = new TextEncoder().encode(canonicalXml);
        handler.write(buffer);

        xmlFree(txtPtr);
    } finally {
        if (tempDoc) {
            xmlFreeDoc(tempDoc);
        }
        if (prefixArray) {
            prefixArray.dispose();
        }
    }
}

/**
 * Canonicalize an XML document with a node set
 *
 * TODO: I can't figure out how to add namespace nodes to the node set.
 *       (Error: Unsupported node type 18)
 */
export function canonicalizeWithNodeSet(
    docPtr: XmlDocPtr,
    handler: XmlOutputBufferHandler,
    options: C14NOptionsNodeSet,
): void {
    using docTxtPtr = new DisposableMalloc(4);
    let prefixArray: CStringArrayWrapper | null = null;
    let nodeSet: XmlNodeSetWrapper | null = null;

    try {
        // If inclusiveNamespaces is provided
        if (options.inclusiveNamespacePrefixList) {
            prefixArray = new CStringArrayWrapper(options.inclusiveNamespacePrefixList);
        }

        // Create nodeSet wrapper
        nodeSet = new XmlNodeSetWrapper(options.nodeSet.map((item) => item._nodePtr));

        const mode = options.mode ?? XmlC14NMode.XML_C14N_1_0;
        const withComments = options.withComments ? 1 : 0;

        const result = xmlC14NDocDumpMemory(
            docPtr,
            nodeSet._ptr,
            mode,
            prefixArray ? prefixArray._ptr : 0,
            withComments,
            docTxtPtr._ptr,
        );

        if (result < 0) {
            throw new XmlError('Failed to canonicalize XML with node set');
        }

        const txtPtr = getValue(docTxtPtr._ptr, 'i32');
        if (!txtPtr) throw new XmlError('Failed to get canonicalized XML');

        const canonicalXml = UTF8ToString(txtPtr, result);
        const buffer = new TextEncoder().encode(canonicalXml);
        handler.write(buffer);

        xmlFree(txtPtr);
    } finally {
        if (prefixArray) {
            prefixArray.dispose();
        }
        if (nodeSet) {
            nodeSet.dispose();
        }
    }
}

/**
 * Canonicalize an XML document with a callback
 */
export function canonicalizeWithCallback<T>(
    docPtr: XmlDocPtr,
    handler: XmlOutputBufferHandler,
    options: C14NOptionsCallback<T>,
): void {
    using outputBuffer = new DisposableXmlOutputBuffer();
    let prefixArray: CStringArrayWrapper | null = null;
    let contextStorage: ContextStorage<T> | null = null;
    let callbackPtr: Pointer | null = null;
    let userDataPtr = 0;

    try {
        // If inclusiveNamespaces is provided
        if (options.inclusiveNamespacePrefixList) {
            prefixArray = new CStringArrayWrapper(options.inclusiveNamespacePrefixList);
        }

        // Set up callback and user data
        if (options.userData !== undefined) {
            contextStorage = new ContextStorage<T>();
            userDataPtr = contextStorage.allocate(options.userData);
        }

        callbackPtr = getC14NIsVisibleCallback(options.isVisibleCallback, contextStorage);

        const withComments = options.withComments ? 1 : 0;

        const result = xmlC14NExecute(
            docPtr,
            callbackPtr,
            userDataPtr,
            options.mode,
            prefixArray ? prefixArray._ptr : 0,
            withComments,
            outputBuffer.getOutputBufferPtr(),
        );

        if (result < 0) {
            throw new XmlError('Failed to canonicalize XML with callback');
        }

        const caninicalizedXml = outputBuffer.getContent();

        // TODO: handle this better
        handler.write(Buffer.from(caninicalizedXml));
    } finally {
        if (prefixArray) {
            prefixArray.dispose();
        }
        if (contextStorage) {
            contextStorage.free(userDataPtr);
        }
    }
}

/**
 * Canonicalize an XML document (default mode - entire document)
 */
export function canonicalizeDocument(
    docPtr: XmlDocPtr,
    handler: XmlOutputBufferHandler,
    options?: C14NOptionsBase,
): void {
    using docTxtPtr = new DisposableMalloc(4);
    let prefixArray: CStringArrayWrapper | null = null;

    try {
        // If inclusiveNamespaces is provided
        if (options && options.inclusiveNamespacePrefixList) {
            prefixArray = new CStringArrayWrapper(options.inclusiveNamespacePrefixList);
        }

        const mode = options && options.mode ? options.mode : XmlC14NMode.XML_C14N_1_0;
        const withComments = options && options.withComments ? 1 : 0;

        const result = xmlC14NDocDumpMemory(
            docPtr,
            0, // no nodeSet
            mode,
            prefixArray ? prefixArray._ptr : 0,
            withComments,
            docTxtPtr._ptr,
        );

        if (result < 0) {
            throw new XmlError('Failed to canonicalize XML');
        }

        const txtPtr = getValue(docTxtPtr._ptr, 'i32');
        if (!txtPtr) throw new XmlError('Failed to get canonicalized XML');

        const canonicalXml = UTF8ToString(txtPtr, result);
        const buffer = new TextEncoder().encode(canonicalXml);
        handler.write(buffer);

        xmlFree(txtPtr);
    } finally {
        if (prefixArray) {
            prefixArray.dispose();
        }
    }
}

// export function onlyATest(): string {
//     const xmlString = '<root><child attr="value">text</child></root>';
//     const doc = XmlDocument.fromString(xmlString);
//
//     const buf = xmlBufferCreate();
//     const bufbuf = xmlOutputBufferCreateBuffer(buf, 0);
//
//     const canonical = xmlC14NExecute(
//         doc._ptr,
//         0,
//         0,
//         0,
//         0,
//         0,
//         bufbuf,
//     );
//     const errPtr = xmlGetLastError();
//     if (errPtr) {
//         const code = getValue(errPtr + 16, 'i32'); // offset depends on struct layout
//         const msgPtr = getValue(errPtr + 8, '*'); // check xmlError struct in libxml2
//         const msg = UTF8ToString(msgPtr);
//         console.error('C14N error:', code, msg);
//     }
//
//     return canonical.toString();
// }
