/**
 * This is the main script of the library.
 *
 * After installing the library in your `node_modules` directory,
 * you can import the class and other elements like this:
 *
 * ```ts
 * import { <symbol> } from 'libxml2-wasm';
 * ```
 * @module libxml2-wasm
 */
export * as diag from './diag.mjs';
export * as disposable from './disposable.mjs';
export type { NamespaceMap } from './xpath.mjs';
export { XmlXPath, XmlXPathError } from './xpath.mjs';
export type { XmlNamedNode } from './nodes.mjs';
export {
    XmlAttribute,
    XmlCData,
    XmlComment,
    XmlElement,
    XmlEntityReference,
    XmlNode,
    XmlSimpleNode,
    XmlText,
    XmlTreeNode,
} from './nodes.mjs';
export type { ParseOptions } from './document.mjs';
export { ParseOption, XmlDocument, XmlParseError } from './document.mjs';
export type {
    ErrorDetail,
    SaveOptions,
    XmlInputProvider,
    XmlOutputBufferHandler,
} from './libxml2.mjs';
export {
    xmlCleanupInputProvider,
    XmlError,
    XmlLibError,
    xmlRegisterInputProvider,
} from './libxml2.mjs';
export { XmlDtd } from './dtd.mjs';
export {
    DtdValidator,
    RelaxNGValidator,
    XmlValidateError,
    XsdValidator,
} from './validates.mjs';
export {
    closeBuffer,
    openBuffer,
    readBuffer,
    XmlBufferInputProvider,
    XmlStringOutputBufferHandler,
} from './utils.mjs';
export {
    XmlC14NMode,
    type C14NOptions,
    type SubtreeC14NOptions,
    type XmlC14NIsVisibleCallback,
} from './c14n.mjs';
