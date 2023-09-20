import XmlDocument from './document.mjs';
import { XmlNodePtr } from './libxml2raw';

export abstract class XmlNode {
    private _doc: XmlDocument;
    private _nodePtr: XmlNodePtr;

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
}

export class XmlComment extends XmlNode {
}

export class XmlText extends XmlNode {
}

export class XmlAttribute extends XmlNode {
}
