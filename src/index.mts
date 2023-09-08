import { Document } from './document.mjs';
import { xmlReadMemory } from './libxml2.mjs';

export interface ParserOptions {
}

export function parseXmlString(source: string, options?: ParserOptions): Document {
    return new Document(xmlReadMemory(source));
}
