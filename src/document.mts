// @ts-ignore
import { xmlFreeDoc, xmlNewDoc } from './libxml2.mjs';
import { Element } from './element.mjs';

export class Document {
    xmlDocPtr: number;

    constructor(xmlDocPtr?: number) {
        this.xmlDocPtr = xmlDocPtr ? xmlDocPtr : xmlNewDoc();
    }

    dispose() {
        xmlFreeDoc(this.xmlDocPtr);
    }

    get(xPath: string) {
    }

    root(): Element | null {
        return null;
    }
}
