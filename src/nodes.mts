import {
    XmlError,
    XmlNodeSetStruct,
    XmlNodeStruct,
    XmlXPathObjectStruct,
    xmlXPathFreeContext, xmlXPathNewContext, xmlXPathNodeEval
} from './libxml2.mjs';
import XmlDocument from './document.mjs';
import { XmlNodePtr } from './libxml2raw';

export abstract class XmlNode {
    protected _doc: XmlDocument;

    protected _nodePtr: XmlNodePtr;

    // TODO: Support node creation
    constructor(doc: XmlDocument, nodePtr: XmlNodePtr) {
        this._doc = doc;
        this._nodePtr = nodePtr;
    }

    get doc(): XmlDocument {
        return this._doc;
    }

    get(xpath: string): XmlNode | boolean | number | string | null {
        const context = xmlXPathNewContext(this._doc._docPtr);
        const xpathObj = xmlXPathNodeEval(this._nodePtr, xpath, context);
        xmlXPathFreeContext(context);
        switch (XmlXPathObjectStruct.type(xpathObj)) {
            case XmlXPathObjectStruct.Type.XPATH_NODESET:
                return this.create(
                    XmlNodeSetStruct.nodeTable(XmlXPathObjectStruct.nodesetval(xpathObj)),
                );
            case XmlXPathObjectStruct.Type.XPATH_BOOLEAN:
                return XmlXPathObjectStruct.boolval(xpathObj);
            case XmlXPathObjectStruct.Type.XPATH_NUMBER:
                return XmlXPathObjectStruct.floatval(xpathObj);
            case XmlXPathObjectStruct.Type.XPATH_STRING:
                return XmlXPathObjectStruct.stringval(xpathObj);
            default:
                return null;
        }
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
    get name(): string {
        return XmlNodeStruct.name_(this._nodePtr);
    }
}

export class XmlComment extends XmlNode {
}

export class XmlText extends XmlNode {
}

export class XmlAttribute extends XmlNode {
    get name(): string {
        return XmlNodeStruct.name_(this._nodePtr);
    }
}
