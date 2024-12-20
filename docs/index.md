# Why Choose Another XML Library?

When comparing the previous two main approaches — 
pure JavaScript implementation and traditional C implementation binding — 
WebAssembly offers a unique combination of advantages.
It provides excellent performance while maintaining the best compatibility with modern JavaScript runtimes.

|                               | Javascript Implementation |       Traditional C Binding        |    WebAssembly    |
|-------------------------------|:-------------------------:|:----------------------------------:|:-----------------:|
| Parsing Speed                 |        Average[^1]        |                Fast                |       Fast        |
| C/C++ Toolchain at Runtime    |       Not required        |            Required[^2]            |   Not Required    |
| Prebuilt Binaries             |            N/A            |  One for each OS / Runtime / Arch  | Universal for all |
| Prebuilt Binary Compatibility |            N/A            | May be broken across libc versions |     Very Good     |
| Browser Compatibility         |            Yes            |                 No                 |        Yes        |

# Supported Environments

Due to the usage of WebAssembly, ES module and [top level await](https://caniuse.com/?search=top%20level%20await) etc,
this library requires the minimum version of the following environments,

| Environment |Version|
|:-----------:|:---:|
|   Node.js   |v16+|
|   Chrome    |V89+|
|    Edge     |V89+|
|   Safari    |v15+|

# Features
- Parsing & Querying
- Validating
- Modifying
- Serializing
- XInclude and XSD include/import (experimental)

[^1]: The performance of different XML libraries can vary significantly.
For more information, refer to the [benchmark](performance.md) provided.
[^2]: The requirement of a C/C++ toolchain at runtime can be waived if prebuilt binaries are available.
