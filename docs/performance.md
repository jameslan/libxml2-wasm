---
title: Performance
---

One of the challenges of working with JavaScript and libxml is that they employ different string encodings.
JavaScript uses UTF-16/UCS-2, while libxml uses UTF-8.
Consequently, we encounter the need to convert strings every time we invoke a function from libxml.

To mitigate this overhead, this library provides two types of parsing functions:
{@link libxml2-wasm!XmlDocument.fromString | String API} and {@link libxml2-wasm!XmlDocument.fromBuffer |Buffer API}.
The String API accepts a JavaScript string as input and converts it into a UTF-8 buffer before processing.
Conversely, the Buffer API takes a UTF-8 buffer as input and directly processes it.
The Buffer API proves to be faster, particularly for large XML documents.
Therefore, we strongly recommend using the Buffer API whenever feasible to enhance the performance of your code.

## Benchmark Report

The benchmark report below evaluates the performance of DOM tree parsing among the following libraries:

- Bindings of libxml
  - String API of libxml2-wasm
  - Buffer API of libxml2-wasm
  - [libxmljs2](https://www.npmjs.com/package/libxmljs2)
- Pure javascript implementation
  - [@rgrove/parse-xml](https://www.npmjs.com/package/@rgrove/parse-xml)
  - [fast-xml-parser](https://www.npmjs.com/package/fast-xml-parser)
  - [xmldoc](https://www.npmjs.com/package/xmldoc)

To execute the benchmark, ensure that the lib is built first:

```sh
npm ci && npm run build
```

Then, navigate to the benchmark directory and execute the following commands:

```sh
cd benchmark && npm ci
npm test
```


```
Environment: NodeJs v18.19.0 on Darwin arm64 Apple M3 Max

Running "fixtures/small.xml: 780 bytes" suite...
Progress: 100%

  libxml2-wasm:
    120 578 ops/s, ±0.12%   | 28% slower

  libxml2-wasm(buffer api):
    167 479 ops/s, ±0.37%   | fastest

  libxmljs2:
    78 688 ops/s, ±1.05%    | 53.02% slower

  @rgrove/parse-xml:
    78 790 ops/s, ±0.19%    | 52.96% slower

  fast-xml-parser:
    52 077 ops/s, ±0.27%    | 68.91% slower

  xmldoc:
    41 125 ops/s, ±0.42%    | slowest, 75.44% slower

Running "fixtures/medium.xml: 35562 bytes" suite...
Progress: 100%

  libxml2-wasm:
    6 013 ops/s, ±0.10%    | 64.87% slower

  libxml2-wasm(buffer api):
    17 114 ops/s, ±0.14%   | fastest

  libxmljs2:
    12 414 ops/s, ±1.82%   | 27.46% slower

  @rgrove/parse-xml:
    5 049 ops/s, ±0.20%    | 70.5% slower

  fast-xml-parser:
    2 708 ops/s, ±0.46%    | 84.18% slower

  xmldoc:
    1 912 ops/s, ±0.41%    | slowest, 88.83% slower

Running "fixtures/large.xml: 2337522 bytes" suite...
Progress: 100%

  libxml2-wasm:
    43 ops/s, ±0.11%   | 30.65% slower

  libxml2-wasm(buffer api):
    62 ops/s, ±0.27%   | fastest

  libxmljs2:
    50 ops/s, ±1.41%   | 19.35% slower

  @rgrove/parse-xml:
    19 ops/s, ±0.93%   | 69.35% slower

  fast-xml-parser:
    16 ops/s, ±0.37%   | 74.19% slower

  xmldoc:
    11 ops/s, ±1.13%   | slowest, 82.26% slower
```
