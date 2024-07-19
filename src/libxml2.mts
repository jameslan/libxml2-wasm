import type {
    CString,
    Pointer,
    XmlAttrPtr,
    XmlDocPtr,
    XmlErrorPtr,
    XmlNodePtr,
    XmlNsPtr,
    XmlParserCtxtPtr,
    XmlXPathCompExprPtr,
    XmlXPathContextPtr,
} from './libxml2raw.js';
import moduleLoader from './libxml2raw.js';

const libxml2 = await moduleLoader();

/**
 * Base class for exceptions.
 *
 * All thrown exceptions in this library will be this class or the subclasses of this class.
 */
export class XmlError extends Error {}

export interface ErrorDetail {
    /**
     * The message of the error during processing.
     */
    message: string;
    /**
     * The line number of the xml file, where the error is occurred.
     */
    line: number;
    /**
     * The column number of the xml file, where the error is occurred.
     */
    col: number;
}

/**
 * An exception class represents the error in libxml2
 */
export class XmlLibError extends XmlError {
    details: ErrorDetail[];

    constructor(message: string, details: ErrorDetail[]) {
        super(message);
        this.details = details;
    }
}

function withStringUTF8<R>(str: string | null, process: (buf: number, len: number) => R): R {
    if (!str) {
        return process(0, 0);
    }
    const len = libxml2.lengthBytesUTF8(str);
    const buf = libxml2._malloc(len + 1);
    libxml2.stringToUTF8(str, buf, len + 1);
    const ret = process(buf, len);
    libxml2._free(buf);
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
    url: string,
    encoding: string,
    options: number,
): XmlDocPtr {
    return withStringUTF8(
        xmlString,
        (buf, len) => libxml2._xmlCtxtReadMemory(ctxt, buf, len, 0, 0, options),
    );
}

export function xmlReadMemory(
    ctxt: XmlParserCtxtPtr,
    xmlBuffer: Uint8Array,
    url: string,
    encoding: string,
    options: number,
): XmlDocPtr {
    return withCString(
        xmlBuffer,
        (buf, len) => libxml2._xmlCtxtReadMemory(ctxt, buf, len, 0, 0, options),
    );
}

export function xmlReadFile(
    ctxt: XmlParserCtxtPtr,
    filename: string,
    url: string,
    encoding: string,
    options: number,
): XmlDocPtr {
    return withStringUTF8(
        filename,
        (fnBuf) => withStringUTF8(
            encoding,
            (encBuf) => libxml2._xmlCtxtReadFile(ctxt, fnBuf, encBuf, options),
        ),
    );
}

export function xmlXPathRegisterNs(ctx: XmlXPathContextPtr, prefix: string, uri: string): number {
    return withStringUTF8(prefix, (bufPrefix) => withStringUTF8(
        uri,
        (bufUri) => libxml2._xmlXPathRegisterNs(ctx, bufPrefix, bufUri),
    ));
}

export function xmlHasNsProp(node: XmlNodePtr, name: string, namespace: string | null): XmlAttrPtr {
    return withStringUTF8(name, (bufName) => withStringUTF8(
        namespace,
        (bufNamespace) => libxml2._xmlHasNsProp(node, bufName, bufNamespace),
    ));
}

export function xmlNodeGetContent(node: XmlNodePtr): string {
    return moveUtf8ToString(libxml2._xmlNodeGetContent(node));
}

function getValueFunc(offset: number, type: string): (ptr: number) => number {
    return (ptr: number) => libxml2.getValue(ptr + offset, type);
}

function getStringValueFunc(offset: number): (ptr: number) => string {
    return (ptr: number) => libxml2.UTF8ToString(libxml2.getValue(ptr + offset, 'i8*'));
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

export function xmlSearchNs(doc: XmlDocPtr, node: XmlNodePtr, prefix: string): XmlNsPtr {
    return withStringUTF8(
        prefix,
        (buf) => libxml2._xmlSearchNs(doc, node, buf),
    );
}

export function xmlXPathCtxtCompile(ctxt: XmlXPathContextPtr, str: string): XmlXPathCompExprPtr {
    return withStringUTF8(str, (buf) => libxml2._xmlXPathCtxtCompile(ctxt, buf));
}

export namespace error {
    const errorStorage = new Map<number, ErrorDetail[]>();
    let errIndex = 0;

    export function allocErrorInfo(): number {
        errIndex += 1;
        errorStorage.set(errIndex, []);
        return errIndex;
    }

    export function freeErrorInfo(index: number) {
        errorStorage.delete(index);
    }

    export function getErrorInfo(index: number) {
        return errorStorage.get(index);
    }

    export const errorCollector = libxml2.addFunction((index: number, err: XmlErrorPtr) => {
        errorStorage.get(index)!.push({
            message: XmlErrorStruct.message(err),
            line: XmlErrorStruct.line(err),
            col: XmlErrorStruct.col(err),
        });
    }, 'vii');
}

export class XmlXPathObjectStruct {
    static type = getValueFunc(0, 'i32');

    static nodesetval = getValueFunc(4, '*');

    static boolval = getValueFunc(8, 'i32');

    static floatval = getValueFunc(12, 'double');

    static stringval = getStringValueFunc(20);
}

export module XmlXPathObjectStruct {
    export enum Type {
        XPATH_NODESET = 1,
        XPATH_BOOLEAN = 2,
        XPATH_NUMBER = 3,
        XPATH_STRING = 4,
    }
}

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
}

export class XmlNamedNodeStruct extends XmlTreeCommonStruct {
    static namespace = getValueFunc(36, '*');
}

export class XmlNodeStruct extends XmlNamedNodeStruct {
    static properties = getValueFunc(44, '*');

    static nsDef = getValueFunc(48, '*');

    static line = getValueFunc(56, 'i32');
}

export module XmlNodeStruct {
    export enum Type {
        XML_ELEMENT_NODE = 1,
        XML_ATTRIBUTE_NODE = 2,
        XML_TEXT_NODE = 3,
        XML_CDATA_SECTION_NODE = 4,
        XML_COMMENT_NODE = 8,
    }
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

    static line = getValueFunc(20, 'i32');

    static col = getValueFunc(40, 'i32');
}

export const xmlCtxtSetErrorHandler = libxml2._xmlCtxtSetErrorHandler;
export const xmlDocGetRootElement = libxml2._xmlDocGetRootElement;
export const xmlFreeDoc = libxml2._xmlFreeDoc;
export const xmlFreeParserCtxt = libxml2._xmlFreeParserCtxt;
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
export const xmlResetLastError = libxml2._xmlResetLastError;
export const xmlSchemaFree = libxml2._xmlSchemaFree;
export const xmlSchemaFreeParserCtxt = libxml2._xmlSchemaFreeParserCtxt;
export const xmlSchemaFreeValidCtxt = libxml2._xmlSchemaFreeValidCtxt;
export const xmlSchemaNewDocParserCtxt = libxml2._xmlSchemaNewDocParserCtxt;
export const xmlSchemaNewValidCtxt = libxml2._xmlSchemaNewValidCtxt;
export const xmlSchemaParse = libxml2._xmlSchemaParse;
export const xmlSchemaSetParserStructuredErrors = libxml2._xmlSchemaSetParserStructuredErrors;
export const xmlSchemaSetValidStructuredErrors = libxml2._xmlSchemaSetValidStructuredErrors;
export const xmlSchemaValidateDoc = libxml2._xmlSchemaValidateDoc;
export const xmlXPathCompiledEval = libxml2._xmlXPathCompiledEval;
export const xmlXPathFreeCompExpr = libxml2._xmlXPathFreeCompExpr;
export const xmlXPathFreeContext = libxml2._xmlXPathFreeContext;
export const xmlXPathFreeObject = libxml2._xmlXPathFreeObject;
export const xmlXPathNewContext = libxml2._xmlXPathNewContext;
export const xmlXPathSetContextNode = libxml2._xmlXPathSetContextNode;
