import {
    xmlXPathCtxtCompile,
    xmlXPathFreeCompExpr,
} from "./libxml2.mjs";
import type { XmlXPathCompExprPtr } from './libxml2raw.js';

export default class XmlXPath {
    _xpath: XmlXPathCompExprPtr;

    constructor(xpath: string) {
        this._xpath = xmlXPathCtxtCompile(0, xpath);
    }

    dispose() {
        xmlXPathFreeCompExpr(this._xpath);
    }
}
