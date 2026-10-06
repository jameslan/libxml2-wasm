import { expect } from 'chai';

import {
    HtmlParseOption,
    XmlDocument,
    XmlError,
} from '@libxml2-wasm/lib/index.mjs';

import type { XmlElement } from '@libxml2-wasm/lib/index.mjs';

describe('fromHtmlString', () => {
    it('should parse a well-formed HTML string', () => {
        using doc = XmlDocument.fromHtmlString('<html><body><p>hi</p></body></html>');
        expect(doc.root.name).to.equal('html');
        expect(doc.get('//p')?.content).to.equal('hi');
    });

    it('should add implied html/head/body elements', () => {
        using doc = XmlDocument.fromHtmlString('<p>hi</p>');
        expect(doc.root.name).to.equal('html');
        expect(doc.get('/html/body/p')?.content).to.equal('hi');
    });

    it('should not add implied elements when HTML_PARSE_NOIMPLIED is set', () => {
        using doc = XmlDocument.fromHtmlString(
            '<p>hi</p>',
            { option: HtmlParseOption.HTML_PARSE_NOIMPLIED },
        );
        expect(doc.root.name).to.equal('p');
    });

    it('should recover from broken markup and still build a tree, instead of throwing', () => {
        using doc = XmlDocument.fromHtmlString('<div></span></div>');
        expect(doc.get('//div')?.content).to.equal('');
        expect(doc.get('//span')).to.equal(null);
        expect(doc.warnings.some((w) => w.level === 2)).to.equal(true);
    });

    it('should surface recovery diagnostics as warnings rather than throwing', () => {
        using doc = XmlDocument.fromHtmlString('<b><i></b></i>');
        expect(doc.root.name).to.equal('html');
        expect(doc.warnings.some((w) => w.level === 2)).to.equal(true);
    });

    it('should allow utf8 only', () => {
        expect(() => XmlDocument.fromHtmlString('<p>x</p>', { encoding: 'iso8859-1' })).to.throw(
            XmlError,
            'Non-UTF-8 encoding is not supported for string input, use fromHtmlBuffer instead',
        );
    });

    it('should round-trip non-ASCII characters', () => {
        using doc = XmlDocument.fromHtmlString('<p>café 日本語</p>');
        expect(doc.get('//p')?.content).to.equal('café 日本語');
    });

    it('should decode as UTF-8 even when a <meta charset> claims otherwise', () => {
        using doc = XmlDocument.fromHtmlString(
            '<html><head><meta charset="iso-8859-1"></head><body><p>café 日本語</p></body></html>',
        );
        expect(doc.get('//p')?.content).to.equal('café 日本語');
    });

    it('should pass url through to diagnostics', () => {
        const url = 'https://example.com/docs/index.html';
        using doc = XmlDocument.fromHtmlString('<b>x<i>y</b></i>', { url });
        expect(doc.warnings[0].file).to.equal(url);
    });
});

describe('fromHtmlBuffer', () => {
    it('should parse a well-formed HTML buffer', () => {
        using doc = XmlDocument.fromHtmlBuffer(new TextEncoder().encode('<p>hi</p>'));
        expect(doc.get('/html/body/p')?.content).to.equal('hi');
    });

    it('should round-trip UTF-8 encoded non-ASCII characters given an explicit encoding', () => {
        // Without a BOM or <meta charset>, the HTML parser defaults to windows-1252.
        using doc = XmlDocument.fromHtmlBuffer(
            new TextEncoder().encode('<html><body><p>café 日本語</p></body></html>'),
            { encoding: 'utf-8' },
        );
        expect(doc.get('//p')?.content).to.equal('café 日本語');
    });

    it('should honor an explicit non-UTF8 encoding', () => {
        const html = '<html><body><p>café</p></body></html>';
        const latin1 = new Uint8Array(Array.from(html, (c) => c.charCodeAt(0)));
        using doc = XmlDocument.fromHtmlBuffer(latin1, { encoding: 'iso-8859-1' });
        expect(doc.get('//p')?.content).to.equal('café');
    });

    it('should sniff the encoding from a meta charset tag', () => {
        const html = '<html><head><meta charset="iso-8859-1"></head>'
            + '<body><p>café</p></body></html>';
        const latin1 = new Uint8Array(Array.from(html, (c) => c.charCodeAt(0)));
        using doc = XmlDocument.fromHtmlBuffer(latin1);
        expect(doc.get('//p')?.content).to.equal('café');
    });
});

describe('HTML serialization', () => {
    it('should serialize a document using HTML syntax', () => {
        using doc = XmlDocument.fromHtmlString(
            '<html><body><br><img src="a.png"></body></html>',
        );
        expect(doc.toString({ asHtml: true })).to.contain('<br>');
        expect(doc.toString({ asHtml: true })).to.contain('<img src="a.png">');
    });

    it('should already save as HTML by default, without asHtml, for a parsed HTML document', () => {
        using doc = XmlDocument.fromHtmlString('<html><body><br></body></html>');
        expect(doc.toString()).to.contain('<br>');
    });

    it('should force HTML syntax onto a non-HTML document via asHtml', () => {
        using doc = XmlDocument.fromString('<br/>');
        expect(doc.toString({ format: false })).to.contain('<br/>');
        expect(doc.toString({ format: false, asHtml: true })).to.contain('<br>');
        expect(doc.toString({ format: false, asHtml: true })).to.not.contain('<br/>');
    });

    it('should format HTML output when format is set', () => {
        using doc = XmlDocument.fromHtmlString(
            '<html><body><div><p>a</p><p>b</p></div></body></html>',
            { option: HtmlParseOption.HTML_PARSE_NOBLANKS },
        );
        const formatted = doc.toString({ asHtml: true, format: true });
        const unformatted = doc.toString({ asHtml: true, format: false });
        expect(formatted).to.not.equal(unformatted);
        expect(formatted).to.contain('\n');
    });

    it('should round-trip non-ASCII characters', () => {
        using doc = XmlDocument.fromHtmlString('<p>café 日本語</p>');
        expect(doc.toString({ asHtml: true })).to.contain('café 日本語');
    });

    it('should serialize a single element (outer HTML) via node save', () => {
        using doc = XmlDocument.fromHtmlString(
            '<html><body><p id="x">hi <b>there</b></p></body></html>',
        );
        const p = doc.get('//p') as XmlElement;
        expect(p.toString({ asHtml: true })).to.equal('<p id="x">hi <b>there</b></p>');
    });
});
