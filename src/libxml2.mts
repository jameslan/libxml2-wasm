import type {
    Pointer,
    CString,
    XmlAttrPtr,
    XmlDocPtr,
    XmlNodePtr,
    XmlXPathContextPtr,
    XmlNsPtr,
    XmlXPathCompExprPtr,
} from './libxml2raw.js';
import moduleLoader from './libxml2raw.js';

const libxml2 = await moduleLoader();

export class XmlError extends Error {}
export class XmlParseError extends XmlError {}

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
    xmlString: string,
    url: string,
    encoding: string,
    options: number,
): XmlDocPtr {
    return withStringUTF8(xmlString, (buf, len) => libxml2._xmlReadMemory(buf, len, 0, 0, options));
}

export function xmlReadMemory(
    xmlBuffer: Uint8Array,
    url: string,
    encoding: string,
    options: number,
): XmlDocPtr {
    return withCString(xmlBuffer, (buf, len) => libxml2._xmlReadMemory(buf, len, 0, 0, options));
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
}

export const xmlFreeDoc = libxml2._xmlFreeDoc;

export const xmlNewDoc = libxml2._xmlNewDoc;
export const xmlXPathNewContext = libxml2._xmlXPathNewContext;
export const xmlXPathCompiledEval = libxml2._xmlXPathCompiledEval;
export const xmlXPathFreeCompExpr = libxml2._xmlXPathFreeCompExpr;
export const xmlXPathFreeContext = libxml2._xmlXPathFreeContext;
export const xmlXPathFreeObject = libxml2._xmlXPathFreeObject;
export const xmlXPathSetContextNode = libxml2._xmlXPathSetContextNode;
export const xmlDocGetRootElement = libxml2._xmlDocGetRootElement;

export const xmlGetLastError = libxml2._xmlGetLastError;
export const xmlResetLastError = libxml2._xmlResetLastError;
