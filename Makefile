SRC_FILES := $(shell find src -name '*.ts')

all: lib

lib: $(SRC_FILES) node_modules tsconfig.json
	@./node_modules/.bin/tsc -p tsconfig.json --outDir lib && touch lib

.PHONY: test
test: node_modules
	@./node_modules/.bin/mocha -u tdd -r ts-node/register --extension ts test/*.ts --grep '$(grep)'

.PHONY: coverage
coverage: node_modules
	@./node_modules/.bin/nyc --reporter=html \
	./node_modules/.bin/mocha -u tdd -r ts-node/register --extension ts test/*.ts -R nyan \
		&& open coverage/index.html

.PHONY: lint
lint: node_modules
	@./node_modules/.bin/eslint src --ext .ts --fix

.PHONY: ci-test
ci-test: node_modules
	@./node_modules/.bin/mocha -u tdd -r ts-node/register --extension ts test/*.ts -R list

.PHONY: ci-lint
ci-lint: node_modules
	@./node_modules/.bin/eslint src --ext .ts --max-warnings 0 --format compact && echo "Ok"

node_modules:
	yarn install --non-interactive --frozen-lockfile

.PHONY: clean
clean:
	rm -rf lib/ coverage/

.PHONY: distclean
distclean: clean
	rm -rf node_modules/
