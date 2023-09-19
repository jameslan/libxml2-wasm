import XmlDocument from './document.mjs';
import { xmlReadMemory } from './libxml2.mjs';

export interface ParserOptions {
}

export function parseXmlString(source: string, options?: ParserOptions): XmlDocument | null {
    const docPtr = xmlReadMemory(source);
    if (!docPtr) {
        return null;
    }
    return new XmlDocument(docPtr);
}
