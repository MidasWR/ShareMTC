SHELL := /bin/bash

TAG ?= v1.0.0
SKIP ?=
REGISTRY ?= docker.io/midaswr
REPO ?= MidasWR/ShareMTC
AUTO_COMMIT_PUSH ?= 1
COMMIT_MSG ?= chore: release $(TAG)

SERVICES := authservice adminservice resourceservice billingservice hostagent frontend

skip = $(filter $(1),$(subst ,, ,$(SKIP)))

.PHONY: release auto-commit-push guard-tag test build-images chart-package package-installer github-release

release: auto-commit-push guard-tag test build-images chart-package package-installer github-release

auto-commit-push:
	@if [ "$(AUTO_COMMIT_PUSH)" != "1" ]; then \
		echo "Auto commit/push disabled (AUTO_COMMIT_PUSH=$(AUTO_COMMIT_PUSH))"; \
	else \
		if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then \
			echo "Not a git repository: cannot auto commit/push"; \
			exit 1; \
		fi; \
		git add -A; \
		if git diff --cached --quiet; then \
			echo "No changes to commit"; \
		else \
			git commit -m "$(COMMIT_MSG)"; \
		fi; \
		if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then \
			git push; \
		else \
			git push -u origin HEAD; \
		fi; \
	fi

guard-tag:
	@if [[ ! "$(TAG)" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$$ ]]; then \
		echo "TAG must be semver format vX.Y.Z, got $(TAG)"; \
		exit 1; \
	fi

test:
	@if [ "$(call skip,1)" = "1" ]; then \
		echo "Skipping tests"; \
	else \
		cd services/authservice && go test ./... && \
		cd ../adminservice && go test ./... && \
		cd ../resourceservice && go test ./... && \
		cd ../billingservice && go test ./...; \
	fi

build-images:
	@if [ "$(call skip,2)" = "2" ]; then \
		echo "Skipping container build"; \
	else \
		for svc in $(SERVICES); do \
			docker build -t $(REGISTRY)/host-$$svc:$(TAG) -f services/$$svc/Dockerfile .; \
			docker push $(REGISTRY)/host-$$svc:$(TAG); \
		done; \
	fi

chart-package:
	@if [ "$(call skip,3)" = "3" ]; then \
		echo "Skipping chart package"; \
	else \
		helm package charts/ChartsInfra --version $(TAG) --app-version $(TAG) -d dist && \
		helm package charts/ChartsServices --version $(TAG) --app-version $(TAG) -d dist; \
	fi

package-installer:
	@if [ "$(call skip,4)" = "4" ]; then \
		echo "Skipping installer package"; \
	else \
		mkdir -p dist && \
		cp installer/host-installer.sh dist/host-installer && \
		chmod +x dist/host-installer && \
		cp -r charts dist/charts; \
	fi

github-release:
	@if [ "$(call skip,5)" = "5" ]; then \
		echo "Skipping GitHub release"; \
	else \
		if gh release view "$(TAG)" --repo "$(REPO)" >/dev/null 2>&1; then \
			echo "Release $(TAG) exists: overwrite assets"; \
			gh release upload "$(TAG)" dist/host-installer dist/*.tgz --repo "$(REPO)" --clobber && \
			gh release edit "$(TAG)" --repo "$(REPO)" --title "$(TAG)" --notes "Release $(TAG)"; \
		else \
			gh release create "$(TAG)" dist/host-installer dist/*.tgz --repo "$(REPO)" --title "$(TAG)" --notes "Release $(TAG)"; \
		fi; \
	fi
