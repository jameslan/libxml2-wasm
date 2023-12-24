import XmlDocument from './document.mjs';
import {
    XmlErrorStruct,
    xmlGetLastError,
    XmlParseError,
    xmlReadMemory,
    xmlReadString,
    xmlResetLastError,
} from './libxml2.mjs';
import type { XmlDocPtr } from './libxml2raw';

export { XmlXPath, NamespaceMap } from './xpath.mjs';
export {
    XmlNode,
    XmlAttribute,
    XmlComment,
    XmlElement,
    XmlText,
    XmlCData,
} from './nodes.mjs';
export { default as XmlDocument } from './document.mjs';
export { XmlParseError, XmlError } from './libxml2.mjs';

export enum ParseOption {
    XML_PARSE_DEFAULT = 0,
    /** recover on errors */
    XML_PARSE_RECOVER = 1 << 0,
    /** substitute entities */
    XML_PARSE_NOENT = 1 << 1,
    /** load the external subset */
    XML_PARSE_DTDLOAD = 1 << 2,
    /** default DTD attributes */
    XML_PARSE_DTDATTR = 1 << 3,
    /** validate with the DTD */
    XML_PARSE_DTDVALID = 1 << 4,
    /** suppress error reports */
    XML_PARSE_NOERROR = 1 << 5,
    /** suppress warning reports */
    XML_PARSE_NOWARNING = 1 << 6,
    /** pedantic error reporting */
    XML_PARSE_PEDANTIC = 1 << 7,
    /** remove blank nodes */
    XML_PARSE_NOBLANKS = 1 << 8,
    /** use the SAX1 interface internally */
    XML_PARSE_SAX1 = 1 << 9,
    /** Implement XInclude substitution  */
    XML_PARSE_XINCLUDE = 1 << 10,
    /** Forbid network access */
    XML_PARSE_NONET = 1 << 11,
    /** Do not reuse the context dictionary */
    XML_PARSE_NODICT = 1 << 12,
    /** remove redundant namespaces declarations */
    XML_PARSE_NSCLEAN = 1 << 13,
    /** merge CDATA as text nodes */
    XML_PARSE_NOCDATA = 1 << 14,
    /** do not generate XINCLUDE START/END nodes */
    XML_PARSE_NOXINCNODE = 1 << 15,
    /** compact small text nodes;
     * no modification of the tree allowed afterward
     * (will possibly crash if you try to modify the tree)
     */
    XML_PARSE_COMPACT = 1 << 16,
    /** parse using XML-1.0 before update 5 */
    XML_PARSE_OLD10 = 1 << 17,
    /** do not fixup XINCLUDE xml:base uris */
    XML_PARSE_NOBASEFIX = 1 << 18,
    /** relax any hardcoded limit from the parser */
    XML_PARSE_HUGE = 1 << 19,
    /* parse using SAX2 interface before 2.7.0 */
    XML_PARSE_OLDSAX = 1 << 20,
    /** ignore internal document encoding hint */
    XML_PARSE_IGNORE_ENC = 1 << 21,
    /** Store big lines numbers in text PSVI field */
    XML_PARSE_BIG_LINES = 1 << 22,
}

export interface ParseOptions {
    url?: string; // reserved
    encoding?: string; // reserved
    option?: ParseOption;
}

function toXmlDocument(docPtr: XmlDocPtr): XmlDocument {
    if (!docPtr) {
        const err = xmlGetLastError();
        throw new XmlParseError(XmlErrorStruct.message(err));
    }
    return new XmlDocument(docPtr);
}

export function parseXmlString(
    source: string,
    options: ParseOptions = {},
): XmlDocument {
    xmlResetLastError();
    return toXmlDocument(
        xmlReadString(source, '', '', options.option ?? ParseOption.XML_PARSE_DEFAULT),
    );
}

export function parseXmlBuffer(
    source: Uint8Array,
    options: ParseOptions = {},
): XmlDocument {
    xmlResetLastError();
    return toXmlDocument(
        xmlReadMemory(source, '', '', options.option ?? ParseOption.XML_PARSE_DEFAULT),
    );
}
