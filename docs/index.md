# Why Another Xml Lib?

Comparing to the previous two main approaches,
pure javascript implementation as well as traditional C implementation binding,
using WebAssembly combines the pros from both sides,
providing good performance while keeping the best compatibility with modern Javascript runtime.

| | Javascript Implementation | Traditional C Binding | WebAssembly |
|-|:---:|:---:|:---:|
| Parsing Speed | Average[^1] | Fast | Fast |
| C/C++ Toolchain at Runtime Environment | Not required | Required[^2] | Not Required |
| Prebuilt Binaries | N/A | One for each OS/Runtime version | Universal for all OS/Runtime versions |
| Prebuilt Binary Compatibility | N/A | May broke across libc versions | Very Good |
| Browser Compatibility | Yes | No | Yes |

# Supported Environments

Due to the usage of WebAssembly, ES module and [top level await](https://caniuse.com/?search=top%20level%20await) etc,
it requires the minimum version of the following environments,

| Environment |Version|
|:-----------:|:---:|
|   Node.js   |v16+|
|   Chrome    |V89+|
|    Edge     |V89+|
|   Safari    |v15+|

# Features
- Parsing
- Validating
- XInclude and XSD include/import (experimental)

[^1]: The speed of different libraries varies a lot, see [benchmark](performance.md).
[^2]: The requirement of C/C++ toolchain may be waived if prebuilt binary is available.
