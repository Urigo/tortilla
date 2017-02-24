mocha_path := node_modules/mocha/bin/mocha

test:
	TORTILLA_STDIO=ignore \
	$(mocha_path) tests/test --timeout=15000

.PHONY: test