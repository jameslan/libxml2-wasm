import XmlDocument from './document.mjs';
import {
    XmlErrorStruct,
    xmlGetLastError,
    XmlParseError,
    xmlReadMemory,
    xmlReadString,
    xmlResetLastError,
} from './libxml2.mjs';
import type { XmlDocPtr } from './libxml2raw';

export {
    XmlNode,
    XmlAttribute,
    XmlComment,
    XmlElement,
    XmlText,
} from './nodes.mjs';
export { default as XmlDocument } from './document.mjs';
export { XmlParseError, XmlError } from './libxml2.mjs';

export interface ParserOptions {
}

function toXmlDocument(docPtr: XmlDocPtr): XmlDocument {
    if (!docPtr) {
        const err = xmlGetLastError();
        throw new XmlParseError(XmlErrorStruct.message(err));
    }
    return new XmlDocument(docPtr);
}

export function parseXmlString(source: string /* , options?: ParserOptions */): XmlDocument {
    xmlResetLastError();
    return toXmlDocument(xmlReadString(source));
}

export function parseXmlBuffer(source: Uint8Array /* , options? ParserOptions */): XmlDocument {
    xmlResetLastError();
    return toXmlDocument(xmlReadMemory(source));
}
