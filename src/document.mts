// @ts-ignore
import { xmlDocGetRootElement, xmlFreeDoc, xmlNewDoc } from './libxml2.mjs';
import { XmlElement } from './nodes.mjs';

export default class XmlDocument {
    _docPtr: number;

    constructor(xmlDocPtr?: number) {
        this._docPtr = xmlDocPtr ?? xmlNewDoc();
    }

    dispose() {
        xmlFreeDoc(this._docPtr);
    }

    get(xPath: string) {
    }

    root(): XmlElement | null {
        const root = xmlDocGetRootElement(this._docPtr);
        if (!root) {
            return null;
        }
        return new XmlElement(this, root);
    }
}
