import * as benny from 'benny';
import { readFileSync } from 'node:fs';
import * as os from 'node:os';
import * as libxmljs2 from 'libxmljs2';
import { XMLParser } from 'fast-xml-parser';
import { XmlDocument } from 'xmldoc';
import { parseXml } from '@rgrove/parse-xml';
import { parseXmlBuffer, parseXmlString } from 'libxml2-wasm';

console.log(`Environment: NodeJs ${process.version} on ${os.type()} ${os.arch()} ${os.cpus()[0].model}\n`);
for (const fixture of ['fixtures/small.xml', 'fixtures/medium.xml', 'fixtures/large.xml']) {
    const xmlString = readFileSync(fixture, 'utf-8');
    const xmlBuffer = readFileSync(fixture);
    benny.suite(
        `${fixture}: ${xmlBuffer.length} bytes`,
        benny.add('libxml2-wasm', () => {
            const doc = parseXmlString(xmlString);
            doc.dispose();
        }),
        benny.add('libxml2-wasm(buffer api)', () => {
            const doc = parseXmlBuffer(xmlBuffer);
            doc.dispose();
        }),
        benny.add('libxmljs2', () => {
            libxmljs2.parseXmlString(xmlString);
        }),
        benny.add('@rgrove/parse-xml', () => {
            parseXml(xmlString);
        }),
        benny.add('fast-xml-parser', () => {
            new XMLParser({ ignoreAttributes: false, processEntities: false}).parse(xmlString)
        }),
        benny.add('xmldoc', () => {
            new XmlDocument(xmlString);
        }),
        benny.cycle(),
        benny.complete(() => console.log()),
    );
}
