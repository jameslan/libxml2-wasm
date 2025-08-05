import {
    xmlXPathCtxtCompile,
    xmlXPathFreeCompExpr,
    XmlError,
} from './libxml2.mjs';
import type { XmlXPathCompExprPtr } from './libxml2raw.mjs';
import { disposeBy, XmlDisposable } from './disposable.mjs';

/**
 * An exception class for XPath compilation errors.
 */
export class XmlXPathError extends XmlError {}

/**
 * Map between the prefix and the URI of the namespace
 */
export interface NamespaceMap {
    [prefix: string]: string;
}

/**
 * The XPath object.
 *
 * At the time of creation, this object compiles the XPath expression,
 * which can be reused multiple times, even for different documents.
 *
 * Note: This object requires to be {@link dispose}d explicitly.
 */
@disposeBy(xmlXPathFreeCompExpr)
export class XmlXPath extends XmlDisposable<XmlXPath> {
    private readonly _xpathSource;

    private readonly _namespaces: NamespaceMap | undefined;

    /** @internal */
    constructor(xpath: XmlXPathCompExprPtr, xpathStr: string, namespaces?: NamespaceMap) {
        super(xpath);
        this._xpathSource = xpathStr;
        this._namespaces = namespaces;
    }

    /**
     * Namespaces and prefixes used in the XPath.
     */
    get namespaces(): NamespaceMap | undefined {
        return this._namespaces;
    }

    /**
     * XPath selector string.
     */
    toString(): string {
        return this._xpathSource;
    }

    /**
     * Create a new XPath object.
     * @param xpathStr The XPath selector string.
     * @param namespaces Namespace map for prefixes used in the `xpathStr`.
     */
    static compile(xpathStr: string, namespaces?: NamespaceMap): XmlXPath {
        const compileResult = xmlXPathCtxtCompile(0, xpathStr);
        if (compileResult === 0) {
            throw new XmlXPathError(`Failed to compile XPath expression: ${xpathStr}`);
        }
        const xpath = XmlXPath.getInstance(compileResult, xpathStr, namespaces);
        return xpath;
    }
}
