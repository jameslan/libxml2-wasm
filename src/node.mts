import XmlDocument from "./document.mjs";
import XmlElement from "./element.mjs";

export default abstract class XmlNode {
    private _doc: XmlDocument;

    constructor(doc: XmlDocument) {
        this._doc = doc;
    }

    doc(): XmlDocument {
        return this._doc;
    }

    // parent(): Element | Document {
    // }

    abstract type(): 'comment' | 'element' | 'text' | 'attribute';
}
