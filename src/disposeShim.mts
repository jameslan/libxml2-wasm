declare global {
    interface SymbolConstructor {
        readonly dispose: unique symbol;
    }
}

(Symbol as any).dispose ??= Symbol.for('Symbol.dispose');

export {};
