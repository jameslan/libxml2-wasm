---
layout: page
title: Memory Management
---

The architecture of libxml2-wasm is shown as the following diagram.

![](mem.svg)

We compile the libxml2 C code into a web assembly module that uses a memory buffer as its heap.
This allows us to store data and share it with Javascript.
However, the data are in the form of C structs,
which are not easy to use in Javascript.
To solve this problem,
we create some Javascript classes that wrap the data and provide convenient methods.

The diagram illustrates how the XML's DOM structure is stored in the shared memory using many objects (C structs and C strings).
However, not all of these objects have a corresponding wrapper object on the Javascript side,
because only some nodes in the DOM structure may be accessed by its user.

## Object disposal

WebAssembly module does not have garbage collection,
which means that the users are resposible to the memory management and have to explicitly free the memory they use.

However, there is a clear ownership hierarchy among the objects,
so the users only have to free the root object and not every single object.
For instance,
when a doc object is freed,
all the nodes inside this doc are also freed.

To dispose an object, call the `dispose` method from its wrapper:

```js
doc.dispose();
```
