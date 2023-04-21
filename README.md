# eosio-core (@greymass/eosio)

JavaScript library for working with EOSIO blockchains

Avaiable on npm: https://www.npmjs.com/package/@greymass/eosio

## Install

```
npm install @greymass/eosio
```

## API Documentation

https://greymass.github.io/eosio-core/

## Documentation

Documentation beyond the automatically generated API documentation above is currently incomplete. Until full documentation is complete, the tests themselves provide good reference material on how to do nearly everything.

https://github.com/greymass/eosio-core/tree/master/test

More:

-   Using APIs: https://github.com/greymass/eosio-core/blob/master/test/api.ts
-   Serialization: https://github.com/greymass/eosio-core/blob/master/test/serializer.ts
-   Crypto Operations: https://github.com/greymass/eosio-core/blob/master/test/crypto.ts
-   Primative EOSIO Types: https://github.com/greymass/eosio-core/blob/master/test/chain.ts

## Reporting Issues

If you think you've found an issue with this codebase, please submit a pull request with a failing unit test to better help us reproduce and understand the issue you are experiencing.

To do this, fork this repository and create your own branch. In this new branch, use the test scaffolding at the path below to write code that either fails to execute, throws an error, or doesn't return the anticipated response.

```
./test/bug-report.ts
```

This specific test can be run within the root project folder either using `make`:

```bash
grep="bug-report" make test
```

Or running `mocha` directly from the installed `./node_modules` folder:

```bash
TS_NODE_PROJECT='./test/tsconfig.json' ./node_modules/.bin/mocha -u tdd -r ts-node/register -r tsconfig-paths/register --extension ts test/*.ts --grep="bug-report"
```

Once your test is failing and successfully shows the issue occurring, please submit a pull request to this repository. Feel free to include any additional details in the body of the pull request that might help us understand the situation.

> NOTE: If you are performing API requests from within unit tests, you will need to prepend `MOCK_RECORD=true` to the above commands in order instruct the test running to execute and cache the API request. Any subsequent API requests will utilize this cache to prevent the test from continously accessing API endpoints. Prefixing your command with `MOCK_RECORD=overwrite` is also possible which forces the test to ignore the cache and fetch new data.

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

## Debugging

Instructions and notes on debugging typescript in your IDE. Explains how to match the Mocha test configuration found in the Makefile.

[Notes on setting up IDE Debuggers](docs/IDE_Debug.md)
