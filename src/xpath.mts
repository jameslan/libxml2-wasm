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

/**
 * XPath object.
 *
 * This object compiles the xpath at creation,
 * which could be reused many times, even for different documents.
 *
 * Note: This object requires to be {@link dispose}d explicitly.
 */
export class XmlXPath {
    /** @internal */
    _xpath: XmlXPathCompExprPtr;

    private readonly _xpathSource;

    private readonly _namespaces: NamespaceMap | undefined;

    constructor(xpath: string, namespaces?: NamespaceMap) {
        this._xpathSource = xpath;
        this._xpath = xmlXPathCtxtCompile(0, xpath);
        this._namespaces = namespaces;
    }

    /**
     * Dispose the XmlXPath.
     *
     * This needs to be called explicitly to avoid resource leak.
     */
    dispose() {
        xmlXPathFreeCompExpr(this._xpath);
        this._xpath = 0;
    }

    /**
     * Namespaces and prefixes used.
     */
    get namespaces(): NamespaceMap | undefined {
        return this._namespaces;
    }

    /**
     * XPath string.
     */
    toString(): string {
        return this._xpathSource;
    }
}
