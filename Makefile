mocha_path := node_modules/mocha/bin/mocha

pack-skeleton:
	tar -czf src/skeleton.tar.gz src/skeleton
	rm -rf src/skeleton

unpack-skeleton:
	mkdir src/skeleton
	tar --strip-components 1 -xf src/skeleton.tar.gz -C src
	rm -rf src/skeleton.tar.gz

publish: pack-skeleton
	npm publish
	make unpack-skeleton

install: pack-skeleton
	sudo npm install -g .
	make unpack-skeleton

test:
	TORTILLA_STDIO=ignore \
	TORTILLA_CWD=/tmp/tortilla_test \
	$(mocha_path) tests/test --timeout=15000

.PHONY: test