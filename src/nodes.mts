import {
    XmlError,
    XmlTreeCommonStruct,
    XmlNodeSetStruct,
    XmlNodeStruct,
    XmlXPathObjectStruct,
    xmlHasProp,
    xmlXPathFreeContext,
    xmlXPathNewContext,
    xmlXPathNodeEval,
} from './libxml2.mjs';
import type XmlDocument from './document.mjs';
import type { XmlNodePtr } from './libxml2raw';

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
     * The name of this node.
     * For some subclasses it returns fixed name.
     * For example, {@link XmlText} returns `text`.
     */
    get name(): string {
        return XmlNodeStruct.name_(this._nodePtr);
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
     * Find the first descendant node matching the given xpath selector
     * @param xpath XPath selector
     * @returns null if not found, otherwise an instance of {@link XmlNode}'s subclass.
     */
    get(xpath: string): XmlNode | null {
        const context = xmlXPathNewContext(this._doc._docPtr);
        const xpathObj = xmlXPathNodeEval(this._nodePtr, xpath, context);
        xmlXPathFreeContext(context);
        if (XmlXPathObjectStruct.type(xpathObj) !== XmlXPathObjectStruct.Type.XPATH_NODESET) {
            return null;
        }
        const nodeSet = XmlXPathObjectStruct.nodesetval(xpathObj);
        if (XmlNodeSetStruct.nodeCount(nodeSet) === 0) {
            return null;
        }
        return this.create(
            XmlNodeSetStruct.nodeTable(nodeSet),
        );
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
            default:
                throw new XmlError(`Unsupported node type ${nodeType}`);
        }
    }
}

export class XmlElement extends XmlNode {
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
     * Get the attribute of this element.
     * Return null if the attribute doesn't exist.
     * @param name The name of the attribute
     */
    attr(name: string): XmlAttribute | null {
        const attrPtr = xmlHasProp(this._nodePtr, name);
        if (!attrPtr) {
            return null;
        }
        return new XmlAttribute(this._doc, attrPtr);
    }
}

export class XmlComment extends XmlNode {
}

export class XmlText extends XmlNode {
    /**
     * The content string of the text node.
     */
    get content(): string {
        return XmlNodeStruct.content(this._nodePtr);
    }
}

export class XmlAttribute extends XmlNode {
    /**
     * The text string of the attribute node.
     */
    get value(): string {
        // TODO: should it be xmlNode or xmlAttribute?
        // xmlNode: xmlXPathObject?
        // xmlAttribute: children/next/prev?
        const text = XmlTreeCommonStruct.children(this._nodePtr);
        if (text) {
            return XmlNodeStruct.content(text);
        }
        return '';
    }
}
