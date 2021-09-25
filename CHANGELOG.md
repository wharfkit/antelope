# Change Log

For @greymass/eosio (a.k.a. eosio-core). Follows semver versioning (currently at major 0 so breaking changes happen in minor versions)

## 0.5.0

Breaking changes:

-   `CurveType` renamed to `KeyType`

Additions:

-   Support for WebAuthn signatures and keys (`SIG_WA_..`, `PUB_WA_..`)
-   Added helpers for peeking at the bytestream in the decoder
-   APIErrors now contain the full http response data
-   Add mutating append method to `Bytes` type
-   Allow `Bytes` to be created from any `ArrayView` or `ArrayBuffer`
