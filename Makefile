SRC_FILES := $(shell find src -name '*.ts')
TEST_FILES := $(wildcard test/*.ts)
BIN := ./node_modules/.bin
MOCHA_OPTS := -u tdd -r ts-node/register -r tsconfig-paths/register --extension ts

lib: ${SRC_FILES} package.json tsconfig.json node_modules rollup.config.js
	@${BIN}/rollup -c && touch lib

.PHONY: test
test: lib node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' \
		${BIN}/mocha ${MOCHA_OPTS} test/*.ts --grep '$(grep)'

.PHONY: coverage
coverage: lib node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' \
		${BIN}/nyc --reporter=html \
		${BIN}/mocha ${MOCHA_OPTS} -R nyan test/*.ts \
			&& open coverage/index.html

.PHONY: ci-test
ci-test: lib node_modules
	@TS_NODE_PROJECT='./test/tsconfig.json' \
		${BIN}/nyc --reporter=text \
		${BIN}/mocha ${MOCHA_OPTS} -R list test/*.ts

.PHONY: check
check: node_modules
	@${BIN}/eslint src --ext .ts --max-warnings 0 --format unix && echo "Ok"

.PHONY: format
format: node_modules
	@${BIN}/eslint src --ext .ts --fix

test/browser.html: $(SRC_FILES) $(TEST_FILES) test/rollup.config.js node_modules
	@${BIN}/rollup -c test/rollup.config.js

.PHONY: browser-test
browser-test: test/browser.html
	@open test/browser.html

node_modules:
	yarn install --non-interactive --frozen-lockfile --ignore-scripts

.PHONY: publish
publish: | distclean node_modules
	@git diff-index --quiet HEAD || (echo "Uncommitted changes, please commit first" && exit 1)
	@git fetch origin && git diff origin/master --quiet || (echo "Changes not pushed to origin, please push first" && exit 1)
	@yarn config set version-tag-prefix "" && yarn config set version-git-message "Version %s"
	@yarn publish && git push && git push --tags

.PHONY: clean
clean:
	rm -rf lib/ coverage/

.PHONY: distclean
distclean: clean
	rm -rf node_modules/
