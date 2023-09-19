import XmlDocument from './document.mjs';
import XmlElement from './element.mjs';
import { XmlNodePtr } from './libxml2raw';

export default abstract class XmlNode {
    private _doc: XmlDocument;
    private _nodePtr: XmlNodePtr;

    constructor(doc: XmlDocument, nodePtr: XmlNodePtr) {
        this._doc = doc;
        this._nodePtr = nodePtr;
    }

    doc(): XmlDocument {
        return this._doc;
    }

    // parent(): Element | Document {
    // }

    abstract type(): 'comment' | 'element' | 'text' | 'attribute';
}
