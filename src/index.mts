import XmlDocument from './document.mjs';
import { XmlParseError, xmlReadMemory } from './libxml2.mjs';

export interface ParserOptions {
}

export function parseXmlString(source: string /* , options?: ParserOptions */): XmlDocument {
    const docPtr = xmlReadMemory(source);
    if (!docPtr) {
        // TODO: get error information from libxml2
        throw new XmlParseError();
    }
    return new XmlDocument(docPtr);
}
