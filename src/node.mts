import { Document } from "./document.mjs";
import { Element } from "./element.mjs";

export abstract class Node {
    private _doc: Document;

    constructor(doc: Document) {
        this._doc = doc;
    }

    doc(): Document {
        return this._doc;
    }

    // parent(): Element | Document {
    // }

    abstract type(): 'comment'|'element'|'text'|'attribute';

}