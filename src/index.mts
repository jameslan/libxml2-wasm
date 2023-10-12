import XmlDocument from './document.mjs';
import {
    XmlErrorStruct,
    xmlGetLastError,
    XmlParseError,
    xmlReadMemory,
} from './libxml2.mjs';

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

export function parseXmlString(source: string /* , options?: ParserOptions */): XmlDocument {
    const docPtr = xmlReadMemory(source);
    if (!docPtr) {
        const err = xmlGetLastError();
        throw new XmlParseError(XmlErrorStruct.message(err));
    }
    return new XmlDocument(docPtr);
}
