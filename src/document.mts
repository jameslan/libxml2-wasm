// @ts-ignore
import { xmlFreeDoc, xmlNewDoc } from './libxml2.mjs';
import XmlElement from './element.mjs';

export default class XmlDocument {
    xmlDocPtr: number;

    constructor(xmlDocPtr?: number) {
        this.xmlDocPtr = xmlDocPtr || xmlNewDoc();
    }

    dispose() {
        xmlFreeDoc(this.xmlDocPtr);
    }

    get(xPath: string) {
    }

    root(): XmlElement | null {
        return null;
    }
}
