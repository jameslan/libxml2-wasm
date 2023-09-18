import XmlNode from './node.mjs';

export default class XmlElement extends XmlNode {
    type(): 'comment' | 'element' | 'text' | 'attribute' {
        return 'element';
    }
}
