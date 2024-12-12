/**
 * This is main script of the library.
 *
 * After installation of the library into your `node_modules` directory,
 * you could import the class etc like
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
    XmlNode,
    XmlAttribute,
    XmlComment,
    XmlElement,
    XmlHierarchyNode,
    XmlNamedNode,
    XmlSimpleNode,
    XmlText,
    XmlCData,
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
export {
    RelaxNGValidator,
    XsdValidator,
    XmlValidateError,
} from './validates.mjs';
