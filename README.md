# eosio-core (@greymass/eosio)

JavaScript library for working with EOSIO blockchains

Avaiable on npm: https://www.npmjs.com/package/@greymass/eosio

## Install

```
npm install @greymass/eosio
```

## API Documentation

https://greymass.github.io/eosio-core/

## Running Tests

### Run the unit test suite:

```
make test
```

### Run the unit test suite with coverage:

```
make coverage
```

The report for the current version can also be found at: https://greymass.github.io/eosio-core/coverage/

### Run the test suite in a browser:

```
make browser-test
```

The browser test suite for the current version of the library is available at: https://greymass.github.io/eosio-core/tests.html

## Documentation

Documentation beyond the automatically generated API documentation above is currently incomplete. Until full documentation is complete, the tests themselves provide good reference material on how to do nearly everything.

https://github.com/greymass/eosio-core/tree/master/test

More:

-   Using APIs: https://github.com/greymass/eosio-core/blob/master/test/api.ts
-   Serialization: https://github.com/greymass/eosio-core/blob/master/test/serializer.ts
-   Crypto Operations: https://github.com/greymass/eosio-core/blob/master/test/crypto.ts
-   Primative EOSIO Types: https://github.com/greymass/eosio-core/blob/master/test/chain.ts

## Debugging

Instructions and notes on debugging typescript in your IDE. Explains how to match the Mocha test configuration found in the Makefile.

[Notes on setting up IDE Debuggers](docs/IDE_Debug.md)
