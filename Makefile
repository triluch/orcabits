NPM ?= npm
export ASTRO_TELEMETRY_DISABLED := 1

.PHONY: install validate update-github build dev preview test test-browser check format

install:
	$(NPM) ci

validate:
	$(NPM) run validate

update-github:
	$(NPM) run update-github

build:
	$(NPM) run build

dev:
	$(NPM) run dev

preview:
	$(NPM) run preview

test:
	$(NPM) test

test-browser:
	$(NPM) run test-browser

check:
	$(NPM) run check

format:
	$(NPM) run format
