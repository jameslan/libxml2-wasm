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
export { XmlXPath, NamespaceMap } from './xpath.mjs';
export {
    XmlAttribute,
    XmlCData,
    XmlComment,
    XmlElement,
    XmlEntityReference,
    XmlNamedNode,
    XmlNode,
    XmlSimpleNode,
    XmlText,
    XmlTreeNode,
} from './nodes.mjs';
export {
    ParseOption,
    ParseOptions,
    SaveOptions,
    XmlDocument,
    XmlParseError,
} from './document.mjs';
export {
    ErrorDetail,
    XmlError,
    XmlLibError,
    xmlCleanupInputProvider,
    XmlInputProvider,
    XmlOutputBufferHandler,
    xmlRegisterInputProvider,
} from './libxml2.mjs';
export { XmlDtd } from './dtd.mjs';
export {
    DtdValidator,
    RelaxNGValidator,
    XsdValidator,
    XmlValidateError,
} from './validates.mjs';
export {
    openBuffer,
    readBuffer,
    closeBuffer,
    XmlBufferInputProvider,
} from './utils.mjs';
