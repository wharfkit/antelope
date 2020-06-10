SRC_FILES := $(shell find src -name '*.ts')
export PATH := ./node_modules/.bin:$(PATH)

all: lib/index.js lib/index.es5.js lib/bundle.js

lib:
	mkdir lib

lib/index.js: $(SRC_FILES) lib node_modules tsconfig.json
	tsc -p tsconfig.json --outDir lib

lib/index.es5.js: $(SRC_FILES) lib node_modules tsconfig.json
	browserify -d -e src/index.ts -p [ tsify -t ES5 ] -s EOSIO --node --no-bundle-external | exorcist lib/index.es5.js.map > lib/index.es5.js

lib/bundle.js: $(SRC_FILES) lib node_modules tsconfig.json
	browserify -d -e src/index.ts -p [ tsify -t ES5 ] -s EOSIO | exorcist lib/bundle.js.map > lib/bundle.js

.PHONY: test
test: node_modules
	@mocha -u tdd -r ts-node/register --extension ts test/*.ts --grep '$(grep)'

.PHONY: coverage
coverage: node_modules
	@nyc --reporter=html mocha -u tdd -r ts-node/register --extension ts test/*.ts -R nyan && open coverage/index.html

.PHONY: lint
lint: node_modules
	@eslint src --ext .ts --fix

.PHONY: ci-test
ci-test: node_modules
	@nyc --reporter=text mocha -u tdd -r ts-node/register --extension ts test/*.ts -R list

.PHONY: ci-lint
ci-lint: node_modules
	@eslint src --ext .ts --max-warnings 0 --format unix && echo "Ok"

node_modules:
	yarn install --non-interactive --frozen-lockfile --ignore-scripts

.PHONY: clean
clean:
	rm -rf lib/ coverage/

.PHONY: distclean
distclean: clean
	rm -rf node_modules/
