# libxml2-wasm

![CI Build on master](https://github.com/jameslan/libxml2-wasm/actions/workflows/build.yml/badge.svg)

Bring libxml2 to browsers using WebAssembly

## Supported Environments

This library uses ES Module and [top level await](https://caniuse.com/?search=top%20level%20await), so it require the following environment.

|Environment|Version|
|:---:|:---:|
|NodeJs|v14.8+|
|Chrome|V89+|
|Edge|V89+|
|Safari|v15+|

## Benchmark

To run the benchmark, build the lib first,

```sh
npm ci && npm run build
```

Then run test in `benchmark` directory,

```sh
cd benchmark && npm ci
npm run test
```

`libxmljs2` is js binding to native library libxml2; while `fast-xml` and `xmldoc` are pure javascript implementations.

```
Environment: NodeJs v18.17.1 on Darwin x64 Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz

Running "fixtures/small.xml: 787 chars" suite...
Progress: 100%

  libxml2-wasm:
    59 122 ops/s, ±3.49%   | fastest

  libxmljs2:
    20 392 ops/s, ±10.93%   | 65.51% slower

  fast-xml-parser:
    15 433 ops/s, ±6.45%   | 73.9% slower

  xmldoc:
    12 842 ops/s, ±4.01%   | slowest, 78.28% slower

Running "fixtures/medium.xml: 35562 chars" suite...
Progress: 100%

  libxml2-wasm:
    2 294 ops/s, ±3.21%   | 32.75% slower

  libxmljs2:
    3 411 ops/s, ±10.12%   | fastest

  fast-xml-parser:
    845 ops/s, ±3.29%     | 75.23% slower

  xmldoc:
    720 ops/s, ±2.75%     | slowest, 78.89% slower

Running "fixtures/large.xml: 2337522 chars" suite...
Progress: 100%

  libxml2-wasm:
    18 ops/s, ±3.66%   | fastest

  libxmljs2:
    12 ops/s, ±28.60%   | 33.33% slower

  fast-xml-parser:
    6 ops/s, ±6.83%    | 66.67% slower

  xmldoc:
    4 ops/s, ±8.64%    | slowest, 77.78% slower
```
