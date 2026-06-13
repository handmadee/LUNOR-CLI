.PHONY: install build dev test clean link unlink

install:
	npm install

build:
	npm run build

dev:
	npm run dev

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

link:
	npm link

unlink:
	npm unlink -g lunor-cli

clean:
	rm -rf dist node_modules

all: install build link

setup: all
	@echo "✓ Lunor CLI installed"
	@echo "→ Run: lunor init zsh >> ~/.zshrc"
	@echo "→ Run: source ~/.zshrc"
	@echo "→ Run: lunor keys add"
