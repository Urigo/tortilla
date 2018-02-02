mocha_path := node_modules/mocha/bin/mocha

test:
	TORTILLA_STDIO=ignore \
	TORTILLA_CACHE_DISABLED=1 \
	$(mocha_path) tests/test --timeout=50000

.PHONY: test