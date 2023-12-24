import {
    xmlXPathCtxtCompile,
    xmlXPathFreeCompExpr,
} from './libxml2.mjs';
import type { XmlXPathCompExprPtr } from './libxml2raw.js';

/**
 * Map between the prefix and the uri of the namespace
 */
export interface NamespaceMap {
    [prefix: string]: string;
}

export class XmlXPath {
    _xpath: XmlXPathCompExprPtr;

    _namespaces: NamespaceMap | undefined;

    constructor(xpath: string, namespaces?: NamespaceMap) {
        this._xpath = xmlXPathCtxtCompile(0, xpath);
        this._namespaces = namespaces;
    }

    dispose() {
        xmlXPathFreeCompExpr(this._xpath);
    }
}
