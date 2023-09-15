import Node from './node.mjs';

export default class Element extends Node {
    type(): 'comment' | 'element' | 'text' | 'attribute' {
        return 'element';
    }
}
