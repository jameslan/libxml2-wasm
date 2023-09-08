import { Node } from "./node.mjs";

export class Element extends Node {
    type(): "comment" | "element" | "text" | "attribute" {
        return 'element';
    }

}