import XmlDocument from './document.mjs';
import { xmlReadMemory } from './libxml2.mjs';

export interface ParserOptions {
}

export function parseXmlString(source: string, options?: ParserOptions): XmlDocument {
    return new XmlDocument(xmlReadMemory(source));
}
