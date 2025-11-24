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
import moduleLoader from './libxml2raw.mjs';
import { ContextStorage } from './utils.mjs';
import { disposeBy, XmlDisposable } from './disposable.mjs';

const libxml2 = await moduleLoader();
libxml2._xmlInitParser();

// Export specific functions needed by other modules
export const {
 getValue, UTF8ToString, lengthBytesUTF8, stringToUTF8, addFunction,
} = libxml2;

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
     * The line number in the xml file where the error occurred.
     */
    line: number;

    /**
     * The column number in the XML file where the error occurred.
     */
    col: number;
}

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
            (urlBuf) => libxml2._xmlCtxtReadMemory(ctxt, xmlBuf, len, urlBuf, 0, options),
            url,
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
            (urlBuf) => libxml2._xmlCtxtReadMemory(ctxt, xmlBuf, len, urlBuf, 0, options),
            url,
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

export namespace error {
    export const storage = new ContextStorage<ErrorDetail[]>();

    export const errorCollector = libxml2.addFunction((index: number, err: XmlErrorPtr) => {
        const file = XmlErrorStruct.file(err);
        const detail: ErrorDetail = {
            message: XmlErrorStruct.message(err),
            line: XmlErrorStruct.line(err),
            col: XmlErrorStruct.col(err),
        };
        if (file != null) {
            detail.file = file;
        }
        storage.get(index).push(detail);
    }, 'vii');
}

export class XmlXPathObjectStruct {
    static type = getValueFunc(0, 'i32');

    static nodesetval = getValueFunc(4, '*');

    static boolval = getValueFunc(8, 'i32');

    static floatval = getValueFunc(16, 'double'); // 8 bytes padding

    static stringval = getStringValueFunc(24);
}

export namespace XmlXPathObjectStruct {
    export enum Type {
        XPATH_NODESET = 1,
        XPATH_BOOLEAN = 2,
        XPATH_NUMBER = 3,
        XPATH_STRING = 4,
    }
} /* c8 ignore next, a branch of typescript generated code is not covered */

export class XmlNodeSetStruct {
    static nodeCount = getValueFunc(0, 'i32');

    static nodeTable(nodeSetPtr: Pointer, size: number) {
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

export namespace XmlNodeStruct {
    export enum Type {
        XML_ELEMENT_NODE = 1,
        XML_ATTRIBUTE_NODE = 2,
        XML_TEXT_NODE = 3,
        XML_CDATA_SECTION_NODE = 4,
        XML_ENTITY_REF_NODE = 5,
        XML_COMMENT_NODE = 8,
        XML_DTD_NODE = 14,
    }
} /* c8 ignore next, a branch of typescript generated code is not covered */

export class XmlNsStruct {
    static next = getValueFunc(0, '*');

    static href = getStringValueFunc(8);

    static prefix = getStringValueFunc(12);
}

export class XmlAttrStruct extends XmlTreeCommonStruct {
}

export class XmlErrorStruct {
    static message = getStringValueFunc(8);

    static file = getNullableStringValueFunc(16);

    static line = getValueFunc(20, 'i32');

    static col = getValueFunc(40, 'i32');
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
    match(filename: string): boolean;

    /**
     * Open the file and return a file descriptor (handle) representing the file.
     * @param filename The file name/path/url
     * @returns undefined on error, number on success.
     */
    open(filename: string): number | undefined;

    /**
     * Read from the file.
     * @param fd File descriptor
     * @param buf Buffer to read into, with a maximum read size of its byteLength.
     * @returns number of bytes actually read, -1 on error.
     */
    read(fd: Pointer, buf: Uint8Array): number;

    /**
     * Close the file.
     * @param fd File descriptor
     * @returns `true` if succeeded.
     */
    close(fd: Pointer): boolean;
}

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
        return res === undefined ? 0 : res;
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

    const res = libxml2._xmlRegisterInputCallbacks(matchFunc, openFunc, readFunc, closeFunc);
    return res >= 0;
}

/**
 * Remove and cleanup all registered input providers.
 * @alpha
 */
export function xmlCleanupInputProvider(): void {
    libxml2._xmlCleanupInputCallbacks();
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
    write(buf: Uint8Array): number;

    /**
     * The callback function that will be triggered once all the data has been consumed.
     *
     * @returns Whether the operation is succeeded.
     */
    close(): boolean;
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

export function xmlSaveToIO(
    handler: XmlOutputBufferHandler,
    encoding: string | null,
    format: number,
): XmlSaveCtxtPtr {
    const index = outputHandlerStorage.allocate(handler); // will be freed in outputClose
    // Support only UTF-8 as of now
    return libxml2._xmlSaveToIO(outputWrite, outputClose, index, 0, format);
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
 * We probably don't want to expose malloc/free directly?
 */
@disposeBy(libxml2._free)
export class DisposableMalloc extends XmlDisposable<DisposableMalloc> {
    constructor(size: number) {
        super(libxml2._malloc(size));
    }
}

/**
 * Helper to create a C-style NULL-terminated array of C strings.
 *
 * Allocates a single contiguous memory block containing:
 * - First: the pointer array (n+1 pointers, last is NULL)
 * - Then: the string data (all strings with null terminators)
 *
 * Memory layout: [ptr0][ptr1]...[ptrN][NULL][str0\0][str1\0]...[strN\0]
 */
export class CStringArrayWrapper extends DisposableMalloc {
    constructor(strings: string[]) {
        // Calculate total size needed
        const pointerArraySize = (strings.length + 1) * 4; // +1 for NULL terminator
        const stringSizes = strings.map((s) => libxml2.lengthBytesUTF8(s) + 1);
        const totalStringSize = stringSizes.reduce((sum, size) => sum + size, 0);
        const totalSize = pointerArraySize + totalStringSize;

        // Allocate single block
        super(totalSize);

        // Write strings and set pointers
        let stringOffset = this._ptr + pointerArraySize;
        const ptrArrayBase = this._ptr / libxml2.HEAP32.BYTES_PER_ELEMENT;
        strings.forEach((s, i) => {
            // Set pointer to this string
            libxml2.HEAP32[ptrArrayBase + i] = stringOffset;
            // Write the string
            libxml2.stringToUTF8(s, stringOffset, stringSizes[i]);
            stringOffset += stringSizes[i];
        });
        // NULL terminate the pointer array
        libxml2.HEAP32[ptrArrayBase + strings.length] = 0;
    }
}

export const xmlAddChild = libxml2._xmlAddChild;
export const xmlAddNextSibling = libxml2._xmlAddNextSibling;
export const xmlAddPrevSibling = libxml2._xmlAddPrevSibling;
export const xmlCtxtSetErrorHandler = libxml2._xmlCtxtSetErrorHandler;
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
    const index = outputHandlerStorage.allocate(handler); // will be freed in outputClose
    return libxml2._xmlOutputBufferCreateIO(outputWrite, outputClose, index, 0);
}

export const xmlOutputBufferClose = libxml2._xmlOutputBufferClose;
export const xmlC14NExecute = libxml2._xmlC14NExecute;
