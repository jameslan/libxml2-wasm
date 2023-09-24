import { getXmlNodeName } from './libxml2.mjs';
import XmlDocument from './document.mjs';
import { XmlNodePtr } from './libxml2raw';

export abstract class XmlNode {
    private _doc: XmlDocument;

    protected _nodePtr: XmlNodePtr;

    // TODO: Node creation
    constructor(doc: XmlDocument, nodePtr: XmlNodePtr) {
        this._doc = doc;
        this._nodePtr = nodePtr;
    }

    doc(): XmlDocument {
        return this._doc;
    }

    // parent(): Element | Document {
    // }
}

export class XmlElement extends XmlNode {
    name(): string {
        return getXmlNodeName(this._nodePtr);
    }
}

export class XmlComment extends XmlNode {
}

export class XmlText extends XmlNode {
}

export class XmlAttribute extends XmlNode {
}
