import {
    XmlError,
    XmlNodeSetStruct,
    XmlNodeStruct,
    XmlXPathObjectStruct,
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
     * The name of the current node.
     * For some subclasses it returns fixed name.
     * For example, {@link XmlText} returns `text`.
     */
    get name(): string {
        return XmlNodeStruct.name_(this._nodePtr);
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

    // parent(): Element | Document {
    // }
}

export class XmlElement extends XmlNode {
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
        const children = XmlNodeStruct.children(this._nodePtr);
        if (children) {
            return XmlNodeStruct.content(children);
        }
        return '';
    }
}
