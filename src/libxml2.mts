import module_loader, { XmlDocPtr, XmlNodePtr, XmlXPathContextPtr, XmlXPathObjectPtr } from './libxml2raw.js';

const libxml2 = await module_loader();

export class XmlError extends Error {}
export class XmlParseError extends XmlError {}

function withStringUTF8<R>(str: string, process: (buf: number, len: number) => R): R {
    const len = libxml2.lengthBytesUTF8(str);
    const buf = libxml2._malloc(len + 1);
    libxml2.stringToUTF8(str, buf, len + 1);
    const ret = process(buf, len);
    libxml2._free(buf);
    return ret;
}

export function xmlReadMemory(xmlString: string): XmlDocPtr {
    return withStringUTF8(xmlString, (buf, len) => libxml2._xmlReadMemory(buf, len, 0, 0, 0));
}

export function xmlXPathNodeEval(
    node: XmlNodePtr,
    xpath: string,
    context: XmlXPathContextPtr,
): XmlXPathObjectPtr {
    return withStringUTF8(
        xpath,
        (buf /* , len */) => libxml2._xmlXPathNodeEval(node, buf, context),
    );
}

export function xmlFreeDoc(doc: XmlDocPtr) {
    libxml2._xmlFreeDoc(doc);
}

function getValueFunc(offset: number, type: string): (ptr: number) => number {
    return (ptr: number) => libxml2.getValue(ptr + offset, type);
}

function getStringValueFunc(offset: number): (ptr: number) => string {
    return (ptr: number) => libxml2.UTF8ToString(libxml2.getValue(ptr + offset, 'i8*'));
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

    static nodeTable(ptr: number) {
        // pointer to a pointer to an array
        return libxml2.getValue(libxml2.getValue(ptr + 8, '*'), '*');
    }
}

export class XmlNodeStruct {
    static type = getValueFunc(4, 'i32');

    static name_ = getStringValueFunc(8);
}

export module XmlNodeStruct {
    export enum Type {
        XML_ELEMENT_NODE = 1,
        XML_ATTRIBUTE_NODE = 2,
        XML_TEXT_NODE = 3,
        XML_COMMENT_NODE = 8,
    }
}

export const xmlNewDoc = libxml2._xmlNewDoc;
export const xmlXPathNewContext = libxml2._xmlXPathNewContext;
export const xmlXPathFreeContext = libxml2._xmlXPathFreeContext;
export const xmlDocGetRootElement = libxml2._xmlDocGetRootElement;
