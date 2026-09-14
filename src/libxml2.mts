import moduleLoader from './libxml2raw.mjs';
import { ContextStorage } from './utils.mjs';

import type {
    CString,
    Pointer,
    XmlAttrPtr,
    XmlDocPtr,
    XmlDtdPtr,
    XmlErrorPtr,
    XmlNodePtr,
    XmlNsPtr,
    XmlOutputBufferPtr,
    XmlParserCtxtPtr,
    XmlSaveCtxtPtr,
    XmlXPathCompExprPtr,
    XmlXPathContextPtr,
} from './libxml2raw.mjs';

const libxml2 = await moduleLoader();
/* c8 ignore next 2, the branch will be hit only on Windows */
if (typeof process !== 'undefined' && process.platform === 'win32') {
    libxml2._xmlSetWinPathEnabled(1);
} else {
    libxml2._xmlSetWinPathEnabled(0);
}
libxml2._xmlInitParser();

/**
 * Export runtime functions needed by other modules.
 * @internal
 */
export const { addFunction } = libxml2;

/**
 * The base class for exceptions in this library.
 *
 * All exceptions thrown in this library will be instances of this class or its subclasses.
 */
export class XmlError extends Error {}

export interface ErrorDetail {
    /**
     * The error message during processing.
     */
    message: string;

    /**
     * The name of the XML file in which the error occurred.
     */
    file?: string;

    /**
     * The severity of the diagnostic (libxml2 xmlErrorLevel):
     * 1 = warning, 2 = error, 3 = fatal.
     */
    level: number;

    /**
     * The line number in the xml file where the error occurred.
     */
    line: number;

    /**
     * The column number in the XML file where the error occurred.
     */
    col: number;

    /**
     * The XPath to the node associated with the error, when available.
     */
    xpath?: string;
}

/**
 * libxml2 xmlErrorLevel: diagnostics at this severity or above are failures.
 * @internal
 */
export const XML_ERR_ERROR = 2;

/**
 * An exception class represents the error in libxml2.
 */
export class XmlLibError extends XmlError {
    /**
     * The detail of errors provided by libxml2.
     */
    details: ErrorDetail[];

    constructor(message: string, details: ErrorDetail[]) {
        super(message);
        this.details = details;
    }
}

function allocUTF8Buffer(str: string | null) {
    if (!str) {
        return [0, 0];
    }
    const len = libxml2.lengthBytesUTF8(str);
    const buf = libxml2._malloc(len + 1);
    libxml2.stringToUTF8(str, buf, len + 1);
    return [buf, len];
}

function withStrings<R>(process: (...buf: number[]) => R, ...strings: (string | null)[]): R {
    const args = strings.map((str) => {
        const [buf] = allocUTF8Buffer(str);
        return buf;
    });
    const ret = process(...args);
    args.forEach((buf) => {
        if (buf) {
            libxml2._free(buf);
        }
    });
    return ret;
}

function withStringUTF8<R>(str: string | null, process: (buf: number, len: number) => R): R {
    const [buf, len] = allocUTF8Buffer(str);
    const ret = process(buf, len);
    if (buf) {
        libxml2._free(buf);
    }
    return ret;
}

function moveUtf8ToString(cstr: CString): string {
    const str = libxml2.UTF8ToString(cstr);
    libxml2._free(cstr);
    return str;
}

function withCString<R>(str: Uint8Array, process: (buf: number, len: number) => R): R {
    if (!str) {
        return process(0, 0);
    }

    const buf = libxml2._malloc(str.length + 1);
    libxml2.HEAPU8.set(str, buf);
    libxml2.HEAPU8[buf + str.length] = 0;
    const ret = process(buf, str.length);
    libxml2._free(buf);
    return ret;
}

export function xmlReadString(
    ctxt: XmlParserCtxtPtr,
    xmlString: string,
    url: string | null,
    encoding: string | null,
    options: number,
): XmlDocPtr {
    return withStringUTF8(
        xmlString,
        (xmlBuf, len) => withStrings(
            (urlBuf, enc) => libxml2._xmlCtxtReadMemory(ctxt, xmlBuf, len, urlBuf, enc, options),
            url,
            encoding,
        ),
    );
}

export function xmlReadMemory(
    ctxt: XmlParserCtxtPtr,
    xmlBuffer: Uint8Array,
    url: string | null,
    encoding: string | null,
    options: number,
): XmlDocPtr {
    return withCString(
        xmlBuffer,
        (xmlBuf, len) => withStrings(
            (urlBuf, enc) => libxml2._xmlCtxtReadMemory(ctxt, xmlBuf, len, urlBuf, enc, options),
            url,
            encoding,
        ),
    );
}

export function xmlXPathRegisterNs(ctx: XmlXPathContextPtr, prefix: string, uri: string): number {
    return withStrings(
        (bufPrefix, bufUri) => libxml2._xmlXPathRegisterNs(ctx, bufPrefix, bufUri),
        prefix,
        uri,
    );
}

export function xmlHasNsProp(node: XmlNodePtr, name: string, namespace: string | null): XmlAttrPtr {
    return withStrings(
        (bufName, bufNamespace) => libxml2._xmlHasNsProp(node, bufName, bufNamespace),
        name,
        namespace,
    );
}

export function xmlSetNsProp(
    node: XmlNodePtr,
    namespace: XmlNsPtr,
    name: string,
    value: string,
): XmlAttrPtr {
    return withStrings(
        (bufName, bufValue) => libxml2._xmlSetNsProp(node, namespace, bufName, bufValue),
        name,
        value,
    );
}

export function xmlNodeGetContent(node: XmlNodePtr): string {
    return moveUtf8ToString(libxml2._xmlNodeGetContent(node));
}

export function xmlGetNodePath(node: XmlNodePtr): string | null {
    if (node === 0) {
        return null;
    }
    const path = libxml2._xmlGetNodePath(node);
    /* c8 ignore next 3, defensive code, only hit if libxml2 fails to allocate the path */
    if (path === 0) {
        return null;
    }
    return moveUtf8ToString(path);
}

export function xmlNodeSetContent(node: XmlNodePtr, content: string): number {
    return withStringUTF8(content, (buf, len) => libxml2._xmlNodeSetContentLen(node, buf, len));
}

function getValueFunc(offset: number, type: string): (ptr: number) => number {
    return (ptr: number) => {
        if (ptr === 0) {
            throw new XmlError('Access with null pointer');
        }
        return libxml2.getValue(ptr + offset, type);
    };
}

function nullableUTF8ToString(str: CString): string | null {
    if (str === 0) {
        return null;
    }
    return libxml2.UTF8ToString(str);
}

function getNullableStringValueFunc(offset: number): (ptr: number) => string | null {
    return (ptr: number) => nullableUTF8ToString(libxml2.getValue(ptr + offset, 'i8*'));
}

function getStringValueFunc(offset: number): (ptr: number) => string {
    return (ptr: number) => {
        if (ptr === 0) {
            throw new XmlError('Access with null pointer');
        }
        return libxml2.UTF8ToString(libxml2.getValue(ptr + offset, 'i8*'));
    };
}

export function xmlGetNsList(doc: XmlDocPtr, node: XmlNodePtr): XmlNsPtr[] {
    const nsList = libxml2._xmlGetNsList(doc, node);
    if (nsList === 0) {
        return [];
    }

    const arr: XmlNsPtr[] = [];

    for (
        let offset = nsList / libxml2.HEAP32.BYTES_PER_ELEMENT;
        libxml2.HEAP32[offset];
        offset += 1
    ) {
        arr.push(libxml2.HEAP32[offset]);
    }

    libxml2._free(nsList);
    return arr;
}

export function xmlSearchNs(doc: XmlDocPtr, node: XmlNodePtr, prefix: string | null): XmlNsPtr {
    return withStrings(
        (buf) => libxml2._xmlSearchNs(doc, node, buf),
        prefix,
    );
}

export function xmlXPathCtxtCompile(ctxt: XmlXPathContextPtr, str: string): XmlXPathCompExprPtr {
    return withStrings((buf) => libxml2._xmlXPathCtxtCompile(ctxt, buf), str);
}

export const error = {
    storage: new ContextStorage<ErrorDetail[]>(),

    errorCollector: libxml2.addFunction((index: number, err: XmlErrorPtr) => {
        const file = XmlErrorStruct.file(err);
        const detail: ErrorDetail = {
            message: XmlErrorStruct.message(err),
            level: XmlErrorStruct.level(err),
            line: XmlErrorStruct.line(err),
            col: XmlErrorStruct.col(err),
        };
        if (file != null) {
            detail.file = file;
        }
        const node = XmlErrorStruct.node(err);
        const xpath = xmlGetNodePath(node);
        if (xpath != null) {
            detail.xpath = xpath;
        }
        error.storage.get(index).push(detail);
    }, 'vii'),
};

export class XmlXPathObjectStruct {
    static type = getValueFunc(0, 'i32');

    static nodesetval = getValueFunc(4, '*');

    static boolval = getValueFunc(8, 'i32');

    static floatval = getValueFunc(16, 'double'); // 8 bytes padding

    static stringval = getStringValueFunc(24);

    static Type = {
        XPATH_NODESET: 1,
        XPATH_BOOLEAN: 2,
        XPATH_NUMBER: 3,
        XPATH_STRING: 4,
    } as const;
}

export class XmlNodeSetStruct {
    static nodeCount = getValueFunc(0, 'i32');

    static nodeTable(nodeSetPtr: Pointer, size: number): Int32Array {
        // pointer to a pointer array, return the pointer array
        const tablePtr = libxml2.getValue(nodeSetPtr + 8, '*') / libxml2.HEAP32.BYTES_PER_ELEMENT;
        return libxml2.HEAP32.subarray(tablePtr, tablePtr + size);
    }
}

export class XmlTreeCommonStruct {
    static type = getValueFunc(4, 'i32');

    static name_ = getStringValueFunc(8);

    static children = getValueFunc(12, '*');

    static last = getValueFunc(16, '*');

    static parent = getValueFunc(20, '*');

    static next = getValueFunc(24, '*');

    static prev = getValueFunc(28, '*');

    static doc = getValueFunc(32, '*');
}

export class XmlNamedNodeStruct extends XmlTreeCommonStruct {
    static namespace = getValueFunc(36, '*');
}

export class XmlNodeStruct extends XmlNamedNodeStruct {
    static properties = getValueFunc(44, '*');

    static nsDef = getValueFunc(48, '*');

    static line = getValueFunc(56, 'i32');
}

export enum XmlNodeType {
    XML_ELEMENT_NODE = 1,
    XML_ATTRIBUTE_NODE = 2,
    XML_TEXT_NODE = 3,
    XML_CDATA_SECTION_NODE = 4,
    XML_ENTITY_REF_NODE = 5,
    XML_PI_NODE = 7,
    XML_COMMENT_NODE = 8,
    XML_DOCUMENT_NODE = 9,
    XML_DTD_NODE = 14,
    XML_ELEMENT_DECL = 15,
    XML_ATTRIBUTE_DECL = 16,
    XML_ENTITY_DECL = 17,
    XML_NAMESPACE_DECL = 18,
}

export class XmlNsStruct {
    static next = getValueFunc(0, '*');

    static href = getStringValueFunc(8);

    static prefix = getStringValueFunc(12);
}

export class XmlAttrStruct extends XmlTreeCommonStruct {
}

export class XmlErrorStruct {
    static message = getStringValueFunc(8);

    static level = getValueFunc(12, 'i32');

    static file = getNullableStringValueFunc(16);

    static line = getValueFunc(20, 'i32');

    static col = getValueFunc(40, 'i32');

    static node(err: XmlErrorPtr): XmlNodePtr {
        if (err === 0) {
            return 0;
        }
        return libxml2.getValue(err + 48, '*');
    }
}

export class XmlDocStruct {
    static standalone = getValueFunc(40, 'i32');

    static version = getStringValueFunc(56);

    static encoding = getNullableStringValueFunc(60);
}

export function xmlNewCDataBlock(doc: XmlDocPtr, content: string): XmlNodePtr {
    return withStringUTF8(content, (buf, len) => libxml2._xmlNewCDataBlock(doc, buf, len));
}

export function xmlNewDocComment(doc: XmlDocPtr, content: string): XmlNodePtr {
    return withStringUTF8(content, (buf) => libxml2._xmlNewDocComment(doc, buf));
}

export function xmlNewDocNode(
    doc: XmlDocPtr,
    ns: XmlNsPtr,
    name: string,
): XmlNodePtr {
    return withStrings(
        (buf) => libxml2._xmlNewDocNode(doc, ns, buf, 0),
        name,
    );
}

export function xmlNewDocText(doc: XmlDocPtr, content: string): XmlNodePtr {
    return withStringUTF8(content, (buf, len) => libxml2._xmlNewDocTextLen(doc, buf, len));
}

export function xmlNewNs(
    node: XmlNodePtr,
    href: string,
    prefix?: string,
): XmlNsPtr {
    return withStrings(
        (bufHref, bufPrefix) => libxml2._xmlNewNs(node, bufHref, bufPrefix),
        href,
        prefix ?? null,
    );
}

export function xmlNewReference(doc: XmlDocPtr, name: string): XmlNodePtr {
    return withStringUTF8(name, (buf) => libxml2._xmlNewReference(doc, buf));
}

/**
 * The input provider for Virtual IO.
 *
 * This interface defines four callbacks for reading the content of XML files.
 * Each callback takes a 4-byte integer as the type of file descriptor.
 *
 * @see {@link xmlRegisterInputProvider}
 * @alpha
 */
export interface XmlInputProvider {
    /**
     * Determine if this input provider should handle this file.
     * @param filename The file name/path/url
     * @returns true if the provider should handle it.
     */
    match: (filename: string) => boolean;

    /**
     * Open the file and return a file descriptor (handle) representing the file.
     * @param filename The file name/path/url
     * @returns undefined on error, number on success.
     */
    open: (filename: string) => number | undefined;

    /**
     * Read from the file.
     * @param fd File descriptor
     * @param buf Buffer to read into, with a maximum read size of its byteLength.
     * @returns number of bytes actually read, -1 on error.
     */
    read: (fd: Pointer, buf: Uint8Array) => number;

    /**
     * Close the file.
     * @param fd File descriptor
     * @returns `true` if succeeded.
     */
    close: (fd: Pointer) => boolean;
}

// Function-table entries of the registered callbacks. addFunction never reuses an entry
// until it is removed, so they are tracked here and released by xmlCleanupInputProvider.
const inputCallbackFuncs: Pointer[] = [];

/**
 * Register the callbacks from the provider to the system.
 *
 * @param provider Provider of callbacks to be registered.
 * @alpha
 */
export function xmlRegisterInputProvider(
    provider: XmlInputProvider,
): boolean {
    const matchFunc = libxml2.addFunction((cfilename: CString) => {
        const filename = libxml2.UTF8ToString(cfilename);
        return provider.match(filename) ? 1 : 0;
    }, 'ii');
    const openFunc = libxml2.addFunction((cfilename: CString) => {
        const filename = libxml2.UTF8ToString(cfilename);
        const res = provider.open(filename);
        return res ?? 0;
    }, 'ii');
    const readFunc = libxml2.addFunction(
        (
            fd: Pointer,
            cbuf: Pointer,
            len: number,
        ) => provider.read(fd, libxml2.HEAPU8.subarray(cbuf, cbuf + len)),
        'iiii',
    );
    const closeFunc = libxml2.addFunction(
        (fd: Pointer) => (provider.close(fd) ? 0 : -1),
        'ii',
    );
    const funcs = [matchFunc, openFunc, readFunc, closeFunc];

    const res = libxml2._xmlRegisterInputCallbacks(matchFunc, openFunc, readFunc, closeFunc);
    if (res < 0) {
        // libxml2 didn't take the callbacks, its callback table is full.
        funcs.forEach((func) => libxml2.removeFunction(func));
        return false;
    }
    inputCallbackFuncs.push(...funcs);
    return true;
}

/**
 * Remove and cleanup all registered input providers.
 *
 * This releases the wasm function-table entries of the registered callbacks, so it must
 * not be called from a provider callback: libxml2 keeps calling the read and close
 * callbacks of the files it still has open.
 * @alpha
 */
export function xmlCleanupInputProvider(): void {
    libxml2._xmlCleanupInputCallbacks();
    inputCallbackFuncs.forEach((func) => libxml2.removeFunction(func));
    inputCallbackFuncs.length = 0;
}

/**
 * An attribute of an element, reported by {@link XmlSaxHandler#startElementNs}.
 *
 * @see {@link XmlSaxHandler}
 */
export interface XmlSaxAttribute {
    /**
     * The local name of the attribute, without the namespace prefix.
     */
    localName: string;

    /**
     * The namespace prefix of the attribute, or `null` if it has none.
     */
    prefix: string | null;

    /**
     * The namespace URI of the attribute, or `null` if it has none.
     */
    namespaceUri: string | null;

    /**
     * The attribute value.
     *
     * Character references and predefined entities are already substituted,
     * with two exceptions mirroring libxml2's SAX behavior, both lifted by
     * {@link ParseOption.XML_PARSE_NOENT | XML_PARSE_NOENT}:
     * an ampersand - however it is written, `&amp;` or `&#38;` -
     * is reported as the character reference `&#38;`,
     * and a reference to an entity declared in the DTD is passed through
     * literally (`&name;`), not substituted.
     */
    value: string;
}

/**
 * SAX callbacks invoked by an {@link XmlSaxParser} while it parses the document.
 *
 * All callbacks are optional; events without a callback are skipped without
 * crossing the WebAssembly boundary.
 * The set of reported events is fixed when the parser is created,
 * but the callback for a reported event is looked up on the handler at
 * every delivery: adding a callback that was absent at creation does not
 * enable its event, while replacing or removing one that was present
 * takes effect at once.
 *
 * Note that libxml2 delivers all names and character data in UTF-8,
 * regardless of the encoding of the input document.
 *
 * @see {@link XmlSaxParser}
 */
export interface XmlSaxHandler {
    /**
     * Called when the parser starts processing the document,
     * before any other callback.
     */
    startDocument?: () => void;

    /**
     * Called at the end of the document,
     * when {@link XmlSaxParser#finish} processed the last pending events.
     */
    endDocument?: () => void;

    /**
     * Called after a start tag, with its namespace information.
     *
     * @param localName The local name of the element, without the namespace prefix
     * @param prefix The namespace prefix of the element, or `null` if it has none
     * @param namespaceUri The namespace URI of the element, or `null` if it has none
     * @param namespaces The namespaces declared on this element,
     * as `[prefix, uri]` pairs; the prefix is `null` for a default namespace declaration
     * @param attributes The attributes of the element; default attributes
     * declared in the internal DTD subset are included only when
     * {@link ParseOption.XML_PARSE_DTDATTR} was set on the parser
     */
    startElementNs?: (
        localName: string,
        prefix: string | null,
        namespaceUri: string | null,
        namespaces: [prefix: string | null, uri: string][],
        attributes: XmlSaxAttribute[],
    ) => void;

    /**
     * Called after an end tag (or at the end of an empty element tag).
     *
     * @param localName The local name of the element, without the namespace prefix
     * @param prefix The namespace prefix of the element, or `null` if it has none
     * @param namespaceUri The namespace URI of the element, or `null` if it has none
     */
    endElementNs?: (
        localName: string,
        prefix: string | null,
        namespaceUri: string | null,
    ) => void;

    /**
     * Called with a run of character data.
     *
     * `data` holds UTF-8 encoded bytes and is a view into the WebAssembly memory:
     * it is valid only during the callback, and only until the WebAssembly
     * memory grows - calling into any API of this library, even on another
     * document or parser, may grow the memory and silently detach the view.
     * Copy the bytes (e.g. with `data.slice()`) before retaining them or
     * calling into the library.
     *
     * libxml2 may deliver a single text node as many consecutive calls,
     * and there is no guarantee that the split falls on a UTF-8 character
     * boundary.
     * To get the text, concatenate the bytes of consecutive calls,
     * or decode them with a streaming `TextDecoder`
     * (`decoder.decode(data, { stream: true })`);
     * don't decode each chunk in isolation.
     *
     * @param data UTF-8 encoded character data, valid only during the callback
     */
    characters?: (data: Uint8Array) => void;

    /**
     * Called with the content of a CDATA section.
     *
     * If this callback is not set, CDATA content is reported through
     * {@link characters} instead.
     *
     * `data` is subject to the same validity and splitting rules as
     * {@link characters}.
     *
     * @param data UTF-8 encoded content of the CDATA section,
     * valid only during the callback
     */
    cdataBlock?: (data: Uint8Array) => void;

    /**
     * Called after a comment.
     *
     * @param text The content of the comment
     */
    comment?: (text: string) => void;

    /**
     * Called after a processing instruction.
     *
     * @param target The target of the processing instruction
     * @param data The data of the processing instruction,
     * or `null` if it has none
     */
    processingInstruction?: (target: string, data: string | null) => void;
}

/**
 * The JavaScript side of a push parser context.
 * Its owner has to keep it alive for as long as the parser is used.
 * @internal
 */
export interface SaxParserContext {
    handler: XmlSaxHandler;
    // A value thrown by a handler callback, to be rethrown after xmlParseChunk returns
    failure?: { error: unknown };
    // Whether XML_PARSE_DTDATTR was set at creation: libxml2 always appends
    // DTD-defaulted attributes to the end of startElementNs's attribute
    // array, counted separately in nb_defaulted, and expects the consumer
    // to trim them when the option is off, the same way its own tree-building
    // SAX2 callback does.
    reportDtdDefaultedAttrs: boolean;
}

// Live SAX parser contexts. libxml2 invokes the SAX callbacks with the parser
// context pointer as their first argument (the SAX user data is left NULL, so
// ctxt->userData falls back to the context itself), which keys this map.
// The references are weak: a handler usually refers back to its own parser -
// that is how stop() is called - so holding one here would root the parser in
// this module and keep it from ever being garbage collected.
const saxParsers = new Map<XmlParserCtxtPtr, WeakRef<SaxParserContext>>();

// Shared skeleton of the SAX trampolines: look up the live dispatch context,
// suppress events after a failure, and never let a JS exception thrown by a
// handler callback unwind through the C frames of the parser - that would
// skip their cleanup - by stopping the parser and holding the exception
// until xmlParseChunk returns.
function saxCallback(
    sig: string,
    invoke: (context: SaxParserContext, ...args: number[]) => void,
): Pointer {
    return libxml2.addFunction((ctxt: XmlParserCtxtPtr, ...args: number[]) => {
        const context = saxParsers.get(ctxt)?.deref();
        /* c8 ignore next 3, defensive: callbacks are suppressed after a failure */
        if (!context || context.failure) {
            return;
        }
        try {
            invoke(context, ...args);
        } catch (err) {
            context.failure = { error: err };
            libxml2._xmlStopParser(ctxt);
        }
    }, sig);
}

const saxStartDocument = saxCallback('vi', (context) => {
    context.handler.startDocument?.();
});

const saxEndDocument = saxCallback('vi', (context) => {
    context.handler.endDocument?.();
});

const saxStartElementNs = saxCallback('viiiiiiiii', (
    context,
    localName,
    prefix,
    uri,
    nbNamespaces,
    namespaces,
    nbAttributes,
    nbDefaulted,
    attributes,
) => {
    // the C callback stays installed when the JS one is removed mid-parse;
    // skip the marshalling below too, not just the invocation
    if (!context.handler.startElementNs) {
        return;
    }
    // pointers are 4-byte aligned and fit in HEAP32:
    // the memory is capped at 2GB (the ALLOW_MEMORY_GROWTH default)
    const ptrs = libxml2.HEAP32;
    // namespaces is an array of nbNamespaces (prefix, uri) pointer pairs
    const nsDecls: [string | null, string][] = [];
    for (let slot = namespaces / 4, end = slot + nbNamespaces * 2; slot < end; slot += 2) {
        nsDecls.push([
            nullableUTF8ToString(ptrs[slot]),
            libxml2.UTF8ToString(ptrs[slot + 1]),
        ]);
    }
    // attributes is an array of nbAttributes
    // (localname, prefix, uri, value, end) pointer quintuplets;
    // the value is NOT null terminated, it spans [value, end)
    // DTD-defaulted attributes (counted in nbDefaulted) are appended after
    // the ones actually written in the document; drop them unless the
    // consumer asked for them, mirroring libxml2's own xmlSAX2StartElementNs
    const reportedAttributes = context.reportDtdDefaultedAttrs
        ? nbAttributes
        : nbAttributes - nbDefaulted;
    const attrs: XmlSaxAttribute[] = [];
    for (let slot = attributes / 4, end = slot + reportedAttributes * 5; slot < end; slot += 5) {
        const value = ptrs[slot + 3];
        const valueEnd = ptrs[slot + 4];
        attrs.push({
            localName: libxml2.UTF8ToString(ptrs[slot]),
            prefix: nullableUTF8ToString(ptrs[slot + 1]),
            namespaceUri: nullableUTF8ToString(ptrs[slot + 2]),
            value: valueEnd > value ? libxml2.UTF8ToString(value, valueEnd - value) : '',
        });
    }
    context.handler.startElementNs(
        libxml2.UTF8ToString(localName),
        nullableUTF8ToString(prefix),
        nullableUTF8ToString(uri),
        nsDecls,
        attrs,
    );
});

const saxEndElementNs = saxCallback('viiii', (context, localName, prefix, uri) => {
    context.handler.endElementNs?.(
        libxml2.UTF8ToString(localName),
        nullableUTF8ToString(prefix),
        nullableUTF8ToString(uri),
    );
});

const saxCharacters = saxCallback('viii', (context, ch, len) => {
    context.handler.characters?.(libxml2.HEAPU8.subarray(ch, ch + len));
});

const saxCdataBlock = saxCallback('viii', (context, ch, len) => {
    context.handler.cdataBlock?.(libxml2.HEAPU8.subarray(ch, ch + len));
});

const saxComment = saxCallback('vii', (context, text) => {
    context.handler.comment?.(libxml2.UTF8ToString(text));
});

const saxProcessingInstruction = saxCallback('viii', (context, target, data) => {
    context.handler.processingInstruction?.(
        libxml2.UTF8ToString(target),
        nullableUTF8ToString(data),
    );
});

/**
 * Field slots of struct xmlSAXHandler (each field is one 4-byte slot on wasm32).
 *
 * Pinned to the field order in the libxml2 submodule's include/libxml/parser.h:
 *
 *  0 internalSubset      1 isStandalone          2 hasInternalSubset
 *  3 hasExternalSubset   4 resolveEntity         5 getEntity
 *  6 entityDecl          7 notationDecl          8 attributeDecl
 *  9 elementDecl        10 unparsedEntityDecl   11 setDocumentLocator
 * 12 startDocument      13 endDocument          14 startElement
 * 15 endElement         16 reference            17 characters
 * 18 ignorableWhitespace 19 processingInstruction 20 comment
 * 21 warning            22 error                23 fatalError
 * 24 getParameterEntity 25 cdataBlock           26 externalSubset
 * 27 initialized        28 _private             29 startElementNs
 * 30 endElementNs       31 serror
 */
enum SaxHandlerSlot {
    startDocument = 12,
    endDocument = 13,
    characters = 17,
    ignorableWhitespace = 18,
    processingInstruction = 19,
    comment = 20,
    cdataBlock = 25,
    initialized = 27,
    startElementNs = 29,
    endElementNs = 30,
}

const SAX_HANDLER_SLOT_COUNT = 32;

// Magic value in the `initialized` field enabling the SAX2 interface;
// without it, xmlCreatePushParserCtxt copies only the SAX1-sized prefix
// of the struct and drops startElementNs/endElementNs.
const XML_SAX2_MAGIC = 0xDEEDBEAF;

/**
 * Create a libxml2 push parser context with SAX callbacks
 * dispatching to `handler`.
 *
 * Only the struct slots for callbacks present on `handler` are populated,
 * so skipped events never cross the WebAssembly boundary.
 *
 * @returns the parser context - 0 on failure - and the dispatch context that
 * the caller has to keep alive for as long as the parser is used.
 * @internal
 */
export function xmlCreatePushParserCtxt(
    handler: XmlSaxHandler,
    filename: string | null,
): [XmlParserCtxtPtr, SaxParserContext] {
    const context: SaxParserContext = { handler, reportDtdDefaultedAttrs: false };
    const sax = libxml2._malloc(SAX_HANDLER_SLOT_COUNT * 4);
    /* c8 ignore next 5, defensive: the allocation fails only when out of memory */
    if (!sax) {
        // a NULL handler would select libxml2's default, tree building one,
        // which reports nothing and defeats the purpose of the push parser
        return [0, context];
    }
    const base = sax / 4;
    const slots = libxml2.HEAP32;
    slots.fill(0, base, base + SAX_HANDLER_SLOT_COUNT);
    if (handler.startDocument) {
        slots[base + SaxHandlerSlot.startDocument] = saxStartDocument;
    }
    if (handler.endDocument) {
        slots[base + SaxHandlerSlot.endDocument] = saxEndDocument;
    }
    if (handler.startElementNs) {
        slots[base + SaxHandlerSlot.startElementNs] = saxStartElementNs;
    }
    if (handler.endElementNs) {
        slots[base + SaxHandlerSlot.endElementNs] = saxEndElementNs;
    }
    if (handler.characters) {
        slots[base + SaxHandlerSlot.characters] = saxCharacters;
        // Deliver whitespace-only character data through the same callback;
        // per the xmlSAXHandler docs, ignorableWhitespace should always be set
        // to the same value as characters, otherwise the parser tries to
        // detect "ignorable" whitespace, which is unreliable in push mode.
        slots[base + SaxHandlerSlot.ignorableWhitespace] = saxCharacters;
    }
    if (handler.cdataBlock) {
        slots[base + SaxHandlerSlot.cdataBlock] = saxCdataBlock;
    }
    if (handler.comment) {
        slots[base + SaxHandlerSlot.comment] = saxComment;
    }
    if (handler.processingInstruction) {
        slots[base + SaxHandlerSlot.processingInstruction] = saxProcessingInstruction;
    }
    slots[base + SaxHandlerSlot.initialized] = XML_SAX2_MAGIC;
    // user data is left NULL: ctxt->userData then defaults to the context
    // itself, which is what the shared callbacks above use as dispatch key
    const ctxt = withStringUTF8(
        filename,
        (buf) => libxml2._xmlCreatePushParserCtxt(sax, 0, 0, 0, buf),
    );
    // the context copies the struct, it doesn't keep the pointer
    libxml2._free(sax);
    if (ctxt) {
        saxParsers.set(ctxt, new WeakRef(context));
    }
    return [ctxt, context];
}

/**
 * Parse a chunk of data with a push parser context.
 *
 * Rethrows the exception if a SAX callback of the chunk threw one.
 *
 * @returns the xmlParserErrors code of the parse, 0 on success.
 * @internal
 */
export function xmlParseChunk(
    ctxt: XmlParserCtxtPtr,
    chunk: Uint8Array | null,
    terminate: boolean,
): number {
    const flag = terminate ? 1 : 0;
    let ret;
    if (chunk) {
        ret = withCString(chunk, (buf, len) => libxml2._xmlParseChunk(ctxt, buf, len, flag));
    } else {
        ret = libxml2._xmlParseChunk(ctxt, 0, 0, flag);
    }
    const parser = saxParsers.get(ctxt)?.deref();
    if (parser?.failure) {
        const { error: err } = parser.failure;
        delete parser.failure;
        throw err;
    }
    return ret;
}

/**
 * Free a push parser context created by {@link xmlCreatePushParserCtxt}
 * and its callback dispatch entry.
 * @internal
 */
export function xmlFreeSaxParserCtxt(ctxt: XmlParserCtxtPtr): void {
    saxParsers.delete(ctxt);
    // Even in SAX mode, libxml2 keeps the entities declared in the internal
    // subset in a document of its own, and releases it only when the parse
    // runs to its end - not when it is stopped, fails or is abandoned.
    // xmlFreeParserCtxt doesn't free it either; xmlCtxtGetDocument detaches
    // it from the context, either handing it over or freeing it itself
    // (after a fatal error).
    const doc = libxml2._xmlCtxtGetDocument(ctxt);
    if (doc) {
        libxml2._xmlFreeDoc(doc);
    }
    libxml2._xmlFreeParserCtxt(ctxt);
}

/**
 * Options to be passed in the call to saving functions
 *
 * @default If not specified, `{ format: true }` will be used.
 * @see {@link XmlDocument#save}
 * @see {@link XmlDocument#toString}
 */
export interface SaveOptions {
    /**
     * Format output. This adds newlines and enables indenting
     * by default.
     * @default false
     */
    format?: boolean;

    /**
     * Don't emit an XML declaration.
     *
     * @default false
     */
    noDeclaration?: boolean;

    /**
     * Don't emit empty tags.
     *
     * @default false
     */
    noEmptyTags?: boolean;

    /**
     * The string used for indentation.
     *
     * @default Two spaces: "  "
     */
    indentString?: string;
    /**
     * The encoding to use for the output.
     *
     * @default The original encoding of the document or utf-8
     */
    encoding?: string;
}

export function xmlSaveOption(options?: SaveOptions): number {
    if (!options) {
        return 1; // default is to format with default setting
    }
    let flags = 0;
    if (options.format) {
        flags |= 1 << 0;
    }
    if (options.noDeclaration) {
        flags |= 1 << 1;
    }
    if (options.noEmptyTags) {
        flags |= 1 << 2;
    }
    return flags;
}

/**
 * Callbacks to process the content in the output buffer.
 */
export interface XmlOutputBufferHandler {
    /**
     * The function that gets called when the content is consumed.
     * @param buf The buffer that holds the output data.
     *
     * @returns The bytes had been consumed or -1 on errors
     */
    write: (buf: Uint8Array) => number;

    /**
     * The callback function that will be triggered once all the data has been consumed.
     *
     * @returns Whether the operation is succeeded.
     */
    close: () => boolean;
}

const outputHandlerStorage = new ContextStorage<XmlOutputBufferHandler>();

const outputWrite = libxml2.addFunction(
    (index: number, buf: Pointer, len: number) => outputHandlerStorage.get(index)
        .write(libxml2.HEAPU8.subarray(buf, buf + len)),
    'iiii',
);

const outputClose = libxml2.addFunction(
    (index: number) => {
        const ret = outputHandlerStorage.get(index).close();
        outputHandlerStorage.free(index);
        return ret;
    },
    'ii',
);

/**
 * Register an output handler and run the FFI creator with its storage index.
 * On success the slot is freed later via {@link outputClose}; when the creator
 * returns a null pointer libxml2 never invokes the close callback, so free here.
 */
function withOutputHandler<T extends number>(
    handler: XmlOutputBufferHandler,
    create: (index: number) => T,
): T {
    const index = outputHandlerStorage.allocate(handler);
    const ptr = create(index);
    if (ptr === 0) {
        outputHandlerStorage.free(index);
    }
    return ptr;
}

export function xmlSaveToIO(
    handler: XmlOutputBufferHandler,
    encoding: string | null,
    format: number,
): XmlSaveCtxtPtr {
    const ctxt = withOutputHandler(handler, (index) => withStringUTF8(
        encoding,
        (encBuf) => libxml2._xmlSaveToIO(outputWrite, outputClose, index, encBuf, format),
    ));
    if (ctxt === 0) {
        throw new XmlError(`Unsupported save encoding "${encoding ?? 'utf-8'}"`);
    }
    return ctxt;
}

enum XmlParserInputFlags {
    XML_INPUT_BUF_STATIC = 1 << 1,
    XML_INPUT_BUF_ZERO_TERMINATED = 1 << 2,
    XML_INPUT_UNZIP = 1 << 3,
    XML_INPUT_NETWORK = 1 << 4,
}

export function xmlCtxtParseDtd(
    ctxt: XmlParserCtxtPtr,
    mem: Uint8Array,
    publicId: string | null,
    systemId: string | null,
): XmlDtdPtr {
    return withCString(mem, (buf, len) => {
        const input = libxml2._xmlNewInputFromMemory(
            0,
            buf,
            len,
            XmlParserInputFlags.XML_INPUT_BUF_STATIC
                | XmlParserInputFlags.XML_INPUT_BUF_ZERO_TERMINATED,
        );
        return withStrings(
            (publicIdBuf, systemIdBuf) => libxml2._xmlCtxtParseDtd(
                ctxt,
                input,
                publicIdBuf,
                systemIdBuf,
            ),
            publicId,
            systemId,
        );
    });
}

export function xmlSaveSetIndentString(
    ctxt: XmlSaveCtxtPtr,
    indent: string,
): number {
    return withStringUTF8(indent, (buf) => libxml2._xmlSaveSetIndentString(ctxt, buf));
}

/**
 * Helper to create a C-style NULL-terminated array of C strings.
 *
 * Allocates a single contiguous memory block containing:
 * - First: the pointer array (n+1 pointers, last is NULL)
 * - Then: the string data (all strings with null terminators)
 *
 * Memory layout: [ptr0][ptr1]...[ptrN][NULL][str0\0][str1\0]...[strN\0]
 *
 * @returns The pointer to the allocated memory. Caller must free with {@link free}.
 */
export function allocCStringArray(strings: string[]): Pointer {
    // Calculate total size needed
    const pointerArraySize = (strings.length + 1) * 4; // +1 for NULL terminator
    const stringSizes = strings.map((s) => libxml2.lengthBytesUTF8(s) + 1);
    const totalStringSize = stringSizes.reduce((sum, size) => sum + size, 0);
    const totalSize = pointerArraySize + totalStringSize;

    // Allocate single block
    const ptr = libxml2._malloc(totalSize);

    // Write strings and set pointers
    let stringOffset = ptr + pointerArraySize;
    const ptrArrayBase = ptr / libxml2.HEAP32.BYTES_PER_ELEMENT;
    strings.forEach((s, i) => {
        // Set pointer to this string
        libxml2.HEAP32[ptrArrayBase + i] = stringOffset;
        // Write the string
        libxml2.stringToUTF8(s, stringOffset, stringSizes[i]);
        stringOffset += stringSizes[i];
    });
    // NULL terminate the pointer array
    libxml2.HEAP32[ptrArrayBase + strings.length] = 0;

    return ptr;
}

export const free = libxml2._free;

export const xmlAddChild = libxml2._xmlAddChild;
export const xmlAddNextSibling = libxml2._xmlAddNextSibling;
export const xmlAddPrevSibling = libxml2._xmlAddPrevSibling;
export const xmlCtxtSetErrorHandler = libxml2._xmlCtxtSetErrorHandler;
export const xmlCtxtSetOptions = libxml2._xmlCtxtSetOptions;
export const xmlCtxtValidateDtd = libxml2._xmlCtxtValidateDtd;
export const xmlDocGetRootElement = libxml2._xmlDocGetRootElement;
export const xmlDocSetRootElement = libxml2._xmlDocSetRootElement;
export const xmlFreeDoc = libxml2._xmlFreeDoc;
export const xmlFreeNode = libxml2._xmlFreeNode;
export const xmlFreeDtd = libxml2._xmlFreeDtd;
export const xmlFreeParserCtxt = libxml2._xmlFreeParserCtxt;
export const xmlGetIntSubset = libxml2._xmlGetIntSubset;
export const xmlGetLastError = libxml2._xmlGetLastError;
export const xmlNewDoc = libxml2._xmlNewDoc;
export const xmlNewParserCtxt = libxml2._xmlNewParserCtxt;
export const xmlRelaxNGFree = libxml2._xmlRelaxNGFree;
export const xmlRelaxNGFreeParserCtxt = libxml2._xmlRelaxNGFreeParserCtxt;
export const xmlRelaxNGFreeValidCtxt = libxml2._xmlRelaxNGFreeValidCtxt;
export const xmlRelaxNGNewDocParserCtxt = libxml2._xmlRelaxNGNewDocParserCtxt;
export const xmlRelaxNGNewValidCtxt = libxml2._xmlRelaxNGNewValidCtxt;
export const xmlRelaxNGParse = libxml2._xmlRelaxNGParse;
export const xmlRelaxNGSetParserStructuredErrors = libxml2._xmlRelaxNGSetParserStructuredErrors;
export const xmlRelaxNGSetValidStructuredErrors = libxml2._xmlRelaxNGSetValidStructuredErrors;
export const xmlRelaxNGValidateDoc = libxml2._xmlRelaxNGValidateDoc;
export const xmlRemoveProp = libxml2._xmlRemoveProp;
export const xmlResetLastError = libxml2._xmlResetLastError;
export const xmlSaveClose = libxml2._xmlSaveClose;
export const xmlSaveDoc = libxml2._xmlSaveDoc;
export const xmlSaveTree = libxml2._xmlSaveTree;
export const xmlSchemaFree = libxml2._xmlSchemaFree;
export const xmlSchemaFreeParserCtxt = libxml2._xmlSchemaFreeParserCtxt;
export const xmlSchemaFreeValidCtxt = libxml2._xmlSchemaFreeValidCtxt;
export const xmlSchemaNewDocParserCtxt = libxml2._xmlSchemaNewDocParserCtxt;
export const xmlSchemaNewValidCtxt = libxml2._xmlSchemaNewValidCtxt;
export const xmlSchemaParse = libxml2._xmlSchemaParse;
export const xmlSchemaSetParserStructuredErrors = libxml2._xmlSchemaSetParserStructuredErrors;
export const xmlSchemaSetValidStructuredErrors = libxml2._xmlSchemaSetValidStructuredErrors;
export const xmlSchemaValidateDoc = libxml2._xmlSchemaValidateDoc;
export const xmlSchemaValidateOneElement = libxml2._xmlSchemaValidateOneElement;
export const xmlSetNs = libxml2._xmlSetNs;
export const xmlStopParser = libxml2._xmlStopParser;
export const xmlUnlinkNode = libxml2._xmlUnlinkNode;
export const xmlXIncludeFreeContext = libxml2._xmlXIncludeFreeContext;
export const xmlXIncludeNewContext = libxml2._xmlXIncludeNewContext;
export const xmlXIncludeProcessNode = libxml2._xmlXIncludeProcessNode;
export const xmlXIncludeSetErrorHandler = libxml2._xmlXIncludeSetErrorHandler;
export const xmlXPathCompiledEval = libxml2._xmlXPathCompiledEval;
export const xmlXPathFreeCompExpr = libxml2._xmlXPathFreeCompExpr;
export const xmlXPathFreeContext = libxml2._xmlXPathFreeContext;
export const xmlXPathFreeObject = libxml2._xmlXPathFreeObject;
export const xmlXPathNewContext = libxml2._xmlXPathNewContext;
export const xmlXPathSetContextNode = libxml2._xmlXPathSetContextNode;

/**
 * Create an output buffer using I/O callbacks (same pattern as xmlSaveToIO)
 * @internal
 */
export function xmlOutputBufferCreateIO(
    handler: XmlOutputBufferHandler,
): XmlOutputBufferPtr {
    return withOutputHandler(
        handler,
        (index) => libxml2._xmlOutputBufferCreateIO(outputWrite, outputClose, index, 0),
    );
}

export const xmlOutputBufferClose = libxml2._xmlOutputBufferClose;
export const xmlC14NExecute = libxml2._xmlC14NExecute;
