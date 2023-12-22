import {
    XmlError,
    xmlHasNsProp,
    xmlGetNsList,
    XmlNamedNodeStruct,
    xmlNodeGetContent,
    XmlNodeSetStruct,
    XmlNodeStruct,
    XmlNsStruct,
    xmlSearchNs,
    xmlXPathFreeContext,
    xmlXPathFreeObject,
    xmlXPathNewContext,
    XmlXPathObjectStruct,
    xmlXPathRegisterNs,
    xmlXPathCompiledEval,
    xmlXPathSetContextNode,
} from './libxml2.mjs';
import type XmlDocument from './document.mjs';
import type { XmlNodePtr } from './libxml2raw.js';
import XmlXPath from "./xpath.mjs";

/**
 * Map between the prefix and the uri of the namespace
 */
export interface NamespaceMap {
    [prefix: string]: string;
}

export abstract class XmlNode {
    protected _doc: XmlDocument;

    protected _nodePtr: XmlNodePtr;

    // TODO: Support node creation
    constructor(doc: XmlDocument, nodePtr: XmlNodePtr) {
        this._doc = doc;
        this._nodePtr = nodePtr;
    }

    /**
     * The {@link XmlDocument} containing this node.
     */
    get doc(): XmlDocument {
        return this._doc;
    }

    /**
     * The parent node of this node.
     *
     * For root node, it's parent is null.
     */
    get parent(): XmlNode | null { // TODO: should it return XmlElement?
        const parent = XmlNodeStruct.parent(this._nodePtr);
        if (!parent || parent === this._doc._docPtr) {
            return null;
        }
        return this.create(parent);
    }

    /**
     * The node of first child.
     *
     * Note that children of an element won't include attributes
     *
     * Return null if this node has no child
     *
     * @see
     *  - {@link lastChild}
     *  - {@link next}
     *  - {@link prev}
     */
    get firstChild(): XmlNode | null {
        const child = XmlNodeStruct.children(this._nodePtr);
        return this.createNullable(child);
    }

    /**
     * The node of last child.
     *
     * Note that children of an element won't include attributes
     *
     * Return null if this node has no child
     *
     * @see
     *  - {@link firstChild}
     *  - {@link next}
     *  - {@link prev}
     */
    get lastChild(): XmlNode | null {
        const child = XmlNodeStruct.last(this._nodePtr);
        return this.createNullable(child);
    }

    /**
     * The node of next sibling.
     *
     * Return null if this node is the last one.
     *
     * @see
     *  - {@link firstChild}
     *  - {@link lastChild}
     *  - {@link prev}
     */
    get next(): XmlNode | null {
        const child = XmlNodeStruct.next(this._nodePtr);
        return this.createNullable(child);
    }

    /**
     * The node of previous sibling.
     *
     * Return null if this node is the first one.
     *
     * @see
     *  - {@link firstChild}
     *  - {@link lastChild}
     *  - {@link next}
     */
    get prev(): XmlNode | null {
        const child = XmlNodeStruct.prev(this._nodePtr);
        return this.createNullable(child);
    }

    /**
     * The content string of the node.
     */
    get content(): string {
        return xmlNodeGetContent(this._nodePtr);
    }

    /**
     * The line number of the node.
     */
    get line(): number {
        return XmlNodeStruct.line(this._nodePtr);
    }

    /**
     * Namespace definitions on this node, including inherited
     */
    get namespaces(): NamespaceMap {
        return xmlGetNsList(this._doc._docPtr, this._nodePtr).reduce(
            // convert to object
            (prev, curr) => ({ ...prev, [XmlNsStruct.prefix(curr)]: XmlNsStruct.href(curr) }),
            {},
        );
    }

    /**
     * Find out corresponding namespace uri of a prefix
     * @param prefix
     */
    namespaceForPrefix(prefix: string): string | null {
        const ns = xmlSearchNs(this._doc._docPtr, this._nodePtr, prefix);
        return ns ? XmlNsStruct.href(ns) : null;
    }

    /**
     * Find the first descendant node matching the given xpath selector
     *
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and uri, used in the XPath
     * @returns null if not found, otherwise an instance of {@link XmlNode}'s subclass.
     * @see
     *  - {@link get}
     */
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null {
        const xpathObj = this.xpathEval(xpath, namespaces);
        if (!xpathObj) {
            return null;
        }
        let ret: XmlNode | null;
        if (XmlXPathObjectStruct.type(xpathObj) !== XmlXPathObjectStruct.Type.XPATH_NODESET) {
            ret = null;
        } else {
            const nodeSet = XmlXPathObjectStruct.nodesetval(xpathObj);
            if (nodeSet === 0 || XmlNodeSetStruct.nodeCount(nodeSet) === 0) {
                ret = null;
            } else {
                ret = this.create(XmlNodeSetStruct.nodeTable(nodeSet, 1)[0]);
            }
        }
        xmlXPathFreeObject(xpathObj);
        return ret;
    }

    private xpathEval(xpath: string | XmlXPath, namespaces?: NamespaceMap) {
        const xpathCompiled = xpath instanceof XmlXPath ? xpath : new XmlXPath(xpath);
        const ret = this.compiledXPathEval(xpathCompiled, namespaces);
        if (!(xpath instanceof XmlXPath)) {
            xpathCompiled.dispose();
        }
        return ret;
    }

    private compiledXPathEval(xpath: XmlXPath, namespaces?: NamespaceMap) {
        const context = xmlXPathNewContext(this._doc._docPtr);
        if (namespaces) {
            Object.entries(namespaces)
                .forEach(([prefix, uri]) => {
                    xmlXPathRegisterNs(context, prefix, uri);
                });
        }
        xmlXPathSetContextNode(this._nodePtr, context);
        const xpathObj = xmlXPathCompiledEval(xpath._xpath, context);
        xmlXPathFreeContext(context);
        return xpathObj;
    }

    /**
     * Find all the descendant nodes matching the given xpath selector.
     * @param xpath XPath selector
     * @param namespaces mapping between prefix and uri, used in the XPath
     * @returns Empty array if invalid xpath or not found any node.
     * @see
     *  - {@link get}
     */
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[] {
        const xpathObj = this.xpathEval(xpath, namespaces);
        if (!xpathObj) {
            return [];
        }

        const nodes: XmlNode[] = [];

        if (XmlXPathObjectStruct.type(xpathObj) === XmlXPathObjectStruct.Type.XPATH_NODESET) {
            const nodeSet = XmlXPathObjectStruct.nodesetval(xpathObj);
            const nodeCount = XmlNodeSetStruct.nodeCount(nodeSet);
            const nodeTable = XmlNodeSetStruct.nodeTable(nodeSet, nodeCount);
            for (let i = 0; i < nodeCount; i += 1) {
                nodes.push(this.create(nodeTable[i]));
            }
        }

        xmlXPathFreeObject(xpathObj);
        return nodes;
    }

    private createNullable(nodePtr: XmlNodePtr): XmlNode | null {
        return nodePtr ? this.create(nodePtr) : null;
    }

    private create(nodePtr: XmlNodePtr): XmlNode {
        const nodeType = XmlNodeStruct.type(nodePtr);
        switch (nodeType) {
            case XmlNodeStruct.Type.XML_ELEMENT_NODE:
                return new XmlElement(this._doc, nodePtr);
            case XmlNodeStruct.Type.XML_ATTRIBUTE_NODE:
                return new XmlAttribute(this._doc, nodePtr);
            case XmlNodeStruct.Type.XML_TEXT_NODE:
                return new XmlText(this._doc, nodePtr);
            case XmlNodeStruct.Type.XML_COMMENT_NODE:
                return new XmlComment(this._doc, nodePtr);
            case XmlNodeStruct.Type.XML_CDATA_SECTION_NODE:
                return new XmlCData(this._doc, nodePtr);
            default:
                throw new XmlError(`Unsupported node type ${nodeType}`);
        }
    }
}

class XmlNamedNode extends XmlNode {
    /**
     * The name of this node.
     */
    get name(): string {
        return XmlNodeStruct.name_(this._nodePtr);
    }

    /**
     * The URI of the namespace applied to this node.
     */
    get namespaceUri(): string {
        const namespace = XmlNamedNodeStruct.namespace(this._nodePtr);
        if (namespace) {
            return XmlNsStruct.href(namespace);
        }
        return '';
    }

    /**
     * The prefix representing the namespace applied to this node.
     */
    get namespacePrefix(): string {
        const namespace = XmlNamedNodeStruct.namespace(this._nodePtr);
        if (namespace) {
            return XmlNsStruct.prefix(namespace);
        }
        return '';
    }
}

export class XmlElement extends XmlNamedNode {
    /**
     * All attributes of this element.
     */
    get attrs(): XmlAttribute[] {
        const attrs: XmlAttribute[] = [];
        for (
            let attr = XmlNodeStruct.properties(this._nodePtr);
            attr;
            attr = XmlNodeStruct.next(attr)
        ) {
            attrs.push(new XmlAttribute(this._doc, attr));
        }

        return attrs;
    }

    /**
     * Namespace definitions on this element
     *
     * @returns Empty object if there's no local namespace definition on this element.
     */
    get localNamespaces(): NamespaceMap {
        const namespaces: NamespaceMap = {};
        for (let ns = XmlNodeStruct.nsDef(this._nodePtr); ns; ns = XmlNsStruct.next(ns)) {
            namespaces[XmlNsStruct.prefix(ns)] = XmlNsStruct.href(ns);
        }
        return namespaces;
    }

    /**
     * Get the attribute of this element.
     * Return null if the attribute doesn't exist.
     * @param name The name of the attribute
     * @param prefix The prefix to the namespace
     */
    attr(name: string, prefix?: string): XmlAttribute | null {
        const namespace = prefix ? this.namespaceForPrefix(prefix) : null;
        const attrPtr = xmlHasNsProp(this._nodePtr, name, namespace);
        if (!attrPtr) {
            return null;
        }
        return new XmlAttribute(this._doc, attrPtr);
    }
}

export class XmlComment extends XmlNode {
}

export class XmlText extends XmlNode {
}

export class XmlAttribute extends XmlNamedNode {
}

export class XmlCData extends XmlNode {
}
