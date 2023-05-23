# Change Log

For @wharfkit/antelope (a.k.a. eosio-core). Follows semver versioning (currently at major 0 so breaking changes happen in minor versions)

## 0.6.0

Breaking changes:

-   Improved handling of binary extensions
    -   Properly support optional values in binary extensions
    -   Fields declared as binary extension (`$`) now always exist unless optional (`?`)
    -   ABISerializableConstructor gains an optional abiDefault function that can be implemented to return a initialized instance of the type
    -   ABIField.default (aka `@Struct.field('sometype', {default: <value>})`) was removed

Notes:

The ABIField.default was removed because it had inconsistent behavior depending if the type was decoded from binary or initalized using `.from`. If you need this behavior, implement it in your custom types `from` method, e.g. `return super.from({my_value: 'im default', ...value});`.

## 0.5.0

Breaking changes:

-   `CurveType` renamed to `KeyType`

Additions:

-   Support for WebAuthn signatures and keys (`SIG_WA_..`, `PUB_WA_..`)
-   Added helpers for peeking at the bytestream in the decoder
-   APIErrors now contain the full http response data
-   Add mutating append method to `Bytes` type
-   Allow `Bytes` to be created from any `ArrayView` or `ArrayBuffer`
