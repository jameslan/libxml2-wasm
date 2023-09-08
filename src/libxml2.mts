import module_loader from './libxml2raw.js';

const libxml2 = await module_loader();

function withStringUTF8<R>(str: string, process: (buf: number, len: number) => R): R {
    const len = libxml2.lengthBytesUTF8(str);
    const buf = libxml2._malloc(len + 1);
    libxml2.stringToUTF8(str, buf, len + 1);
    const ret = process(buf, len);
    libxml2._free(buf);
    return ret;
}

export function xmlReadMemory(xmlString: string) {
    return withStringUTF8(xmlString, (buf, len) => libxml2._xmlReadMemory(buf, len));
}

export function xmlFreeDoc(xmlDocPtr: number) {
    libxml2._xmlFreeDoc(xmlDocPtr);
}

export const xmlNewDoc = libxml2._xmlNewDoc;
