import {
    XmlError,
    xmlGetNsList,
    xmlHasNsProp,
    XmlNamedNodeStruct,
    xmlNewNs,
    xmlNodeGetContent,
    XmlNodeSetStruct,
    XmlNodeStruct,
    XmlNsStruct,
    xmlSearchNs,
    xmlSetNs,
    xmlXPathCompiledEval,
    xmlXPathFreeContext,
    xmlXPathFreeObject,
    xmlXPathNewContext,
    XmlXPathObjectStruct,
    xmlXPathRegisterNs,
    xmlXPathSetContextNode,
} from './libxml2.mjs';
import { XmlDocument } from './document.mjs';
import type { XmlNodePtr } from './libxml2raw.cjs';
import { XmlXPath, NamespaceMap } from './xpath.mjs';

export abstract class XmlNode {
    /** @internal */
    _nodePtr: XmlNodePtr;

    /** @internal */
    constructor(nodePtr: XmlNodePtr) {
        this._nodePtr = nodePtr;
    }

    /**
     * The {@link XmlDocument} containing this node.
     */
    get doc(): XmlDocument {
        return XmlDocument.getInstance(XmlNodeStruct.doc(this._nodePtr));
    }

    /**
     * The parent node of this node.
     *
     * For root node, it's parent is null.
     */
    get parent(): XmlNode | null { // TODO: should it return XmlElement?
        const parent = XmlNodeStruct.parent(this._nodePtr);
        if (!parent || parent === XmlNodeStruct.doc(this._nodePtr)) {
            return null;
        }
        return XmlNode.createNode(parent);
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
        return XmlNode.createNullableNode(child);
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
        return XmlNode.createNullableNode(child);
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
        return XmlNode.createNullableNode(child);
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
        return XmlNode.createNullableNode(child);
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
        return xmlGetNsList(XmlNodeStruct.doc(this._nodePtr), this._nodePtr).reduce(
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
        const ns = xmlSearchNs(XmlNodeStruct.doc(this._nodePtr), this._nodePtr, prefix);
        return ns ? XmlNsStruct.href(ns) : null;
    }

    get(xpath: XmlXPath): XmlNode | null;
    get(xpath: string, namespaces?: NamespaceMap): XmlNode | null;
    get(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode | null;
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
                ret = XmlNode.createNode(XmlNodeSetStruct.nodeTable(nodeSet, 1)[0]);
            }
        }
        xmlXPathFreeObject(xpathObj);
        return ret;
    }

    private xpathEval(xpath: string | XmlXPath, namespaces?: NamespaceMap) {
        const xpathCompiled = xpath instanceof XmlXPath
            ? xpath
            : XmlXPath.create(xpath, namespaces);
        const ret = this.compiledXPathEval(xpathCompiled);
        if (!(xpath instanceof XmlXPath)) {
            xpathCompiled.dispose();
        }
        return ret;
    }

    private compiledXPathEval(xpath: XmlXPath) {
        const context = xmlXPathNewContext(XmlNodeStruct.doc(this._nodePtr));
        if (xpath.namespaces) {
            Object.entries(xpath.namespaces)
                .forEach(([prefix, uri]) => {
                    xmlXPathRegisterNs(context, prefix, uri);
                });
        }
        xmlXPathSetContextNode(this._nodePtr, context);
        const xpathObj = xmlXPathCompiledEval(xpath._ptr, context);
        xmlXPathFreeContext(context);
        return xpathObj;
    }

    find(xpath: XmlXPath): XmlNode[];
    find(xpath: string, namespaces?: NamespaceMap): XmlNode[];
    find(xpath: string | XmlXPath, namespaces?: NamespaceMap): XmlNode[];
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
                nodes.push(XmlNode.createNode(nodeTable[i]));
            }
        }

        xmlXPathFreeObject(xpathObj);
        return nodes;
    }

    private static createNullableNode(nodePtr: XmlNodePtr): XmlNode | null {
        return nodePtr ? XmlNode.createNode(nodePtr) : null;
    }

    private static createNode(nodePtr: XmlNodePtr): XmlNode {
        const nodeType = XmlNodeStruct.type(nodePtr);
        switch (nodeType) {
            case XmlNodeStruct.Type.XML_ELEMENT_NODE:
                return new XmlElement(nodePtr);
            case XmlNodeStruct.Type.XML_ATTRIBUTE_NODE:
                return new XmlAttribute(nodePtr);
            case XmlNodeStruct.Type.XML_TEXT_NODE:
                return new XmlText(nodePtr);
            case XmlNodeStruct.Type.XML_COMMENT_NODE:
                return new XmlComment(nodePtr);
            case XmlNodeStruct.Type.XML_CDATA_SECTION_NODE:
                return new XmlCData(nodePtr);
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

    /**
     * Set the namespace prefix of this node.
     * @param prefix The new prefix to set.
     * Use empty string to set to default namespace,
     * or to remove the prefix (if no default namespace declared).
     */
    set namespacePrefix(prefix: string) {
        // Check if the namespace prefix valid for the current node
        const ns = xmlSearchNs(XmlNodeStruct.doc(this._nodePtr), this._nodePtr, prefix || null);
        if (!ns && prefix) {
            throw new XmlError(`Namespace prefix "${prefix}" not found`);
        }
        xmlSetNs(this._nodePtr, ns);
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
            attrs.push(new XmlAttribute(attr));
        }

        return attrs;
    }

    /**
     * Namespace declaration on this element
     *
     * @returns Empty object if there's no local namespace definition on this element.
     * Note that default namespace uses empty string as key.
     */
    get localNamespaces(): NamespaceMap {
        const namespaces: NamespaceMap = {};
        for (let ns = XmlNodeStruct.nsDef(this._nodePtr); ns; ns = XmlNsStruct.next(ns)) {
            namespaces[XmlNsStruct.prefix(ns)] = XmlNsStruct.href(ns);
        }
        return namespaces;
    }

    /**
     * Add a namespace declaration to this element.
     * @param uri The namespace URI.
     * @param prefix The prefix to the namespace.
     * If not provided, it will be treated as default namespace.
     */
    addLocalNamespace(uri: string, prefix?: string): void {
        xmlNewNs(this._nodePtr, uri, prefix);
    }

    /**
     * Get the attribute of this element.
     * Return null if the attribute doesn't exist.
     * @param name The name of the attribute
     * @param prefix The prefix to the namespace.
     */
    attr(name: string, prefix?: string): XmlAttribute | null {
        const namespace = prefix ? this.namespaceForPrefix(prefix) : null;
        const attrPtr = xmlHasNsProp(this._nodePtr, name, namespace);
        if (!attrPtr) {
            return null;
        }
        return new XmlAttribute(attrPtr);
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
