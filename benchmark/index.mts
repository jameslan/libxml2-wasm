import * as benny from 'benny';
import { readFileSync } from 'fs';
import * as libxmljs2 from 'libxmljs2';
import { XMLParser } from 'fast-xml-parser';
import { XmlDocument } from 'xmldoc';
import { parseXmlString } from 'libxml2-wasm';

for (const fixture of ['fixtures/small.xml', 'fixtures/medium.xml', 'fixtures/large.xml']) {
    const xml = readFileSync(fixture, 'utf-8');
    benny.suite(
        `Parsing ${fixture}: ${xml.length} chars`,
        benny.add('libxmljs2', () => {
            libxmljs2.parseXmlString(xml);
        }),
        benny.add('fast-xml parser', () => {
            new XMLParser({ ignoreAttributes: false, processEntities: false}).parse(xml)
        }),
        benny.add('xmldoc', () => {
            new XmlDocument(xml);
        }),
        benny.add('libxml-wasm', () => {
            const doc = parseXmlString(xml);
            doc.dispose();
        }),
        benny.cycle(),
        benny.complete(() => console.log()),
    )
}
