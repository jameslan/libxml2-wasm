# Performance

Javascript internally uses UTF-16/UCS-2 encoding for strings while libxml uses UTF-8.
This means when we need to convert them on every function invocation.
Among these invocations, parsing is most impacted because the entire xml needs to be converted.

This library provides two set of parsing functions: String API and Buffer API.
Please use the **Buffer API** whenever possible to get best throughput.

## Benchmark

To run the benchmark, build the lib first,

```sh
npm ci && npm run build
```

Then run test in `benchmark` directory,

```sh
cd benchmark && npm ci
npm test
```

`libxmljs2` is js binding to native library libxml2; while `fast-xml` and `xmldoc` are pure javascript implementations.

```
Environment: NodeJs v18.17.1 on Darwin x64 Intel(R) Core(TM) i9-9880H CPU @ 2.30GHz

Running "fixtures/small.xml: 787 bytes" suite...
Progress: 100%

  libxml2-wasm:
    64 645 ops/s, ±1.22%    | 44.35% slower

  libxml2-wasm(buffer api):
    116 157 ops/s, ±0.67%   | fastest

  libxmljs2:
    28 240 ops/s, ±9.20%    | 75.69% slower

  fast-xml-parser:
    18 091 ops/s, ±7.90%    | 84.43% slower

  xmldoc:
    14 310 ops/s, ±1.88%    | slowest, 87.68% slower

Running "fixtures/medium.xml: 35562 bytes" suite...
Progress: 100%

  libxml2-wasm:
    2 706 ops/s, ±0.79%    | 73.57% slower

  libxml2-wasm(buffer api):
    10 237 ops/s, ±0.48%   | fastest

  libxmljs2:
    4 779 ops/s, ±8.57%    | 53.32% slower

  fast-xml-parser:
    995 ops/s, ±2.09%      | 90.28% slower

  xmldoc:
    844 ops/s, ±1.33%      | slowest, 91.76% slower

Running "fixtures/large.xml: 2337522 bytes" suite...
Progress: 100%

  libxml2-wasm:
    22 ops/s, ±1.29%   | 37.14% slower

  libxml2-wasm(buffer api):
    35 ops/s, ±0.88%   | fastest

  libxmljs2:
    21 ops/s, ±14.92%   | 40% slower

  fast-xml-parser:
    6 ops/s, ±5.99%    | 82.86% slower

  xmldoc:
    4 ops/s, ±3.67%    | slowest, 88.57% slower
```
