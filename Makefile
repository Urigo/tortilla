mocha_path := node_modules/mocha/bin/mocha

test:
	TORTILLA_STDIO=ignore \
	TORTILLA_CWD=/tmp/tortilla_test \
	$(mocha_path) tests/test --timeout=15000

.PHONY: test