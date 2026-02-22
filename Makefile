SHELL := /bin/bash

TAG ?= v1.0.0
SKIP ?=
REGISTRY ?= docker.io/midaswr
REPO ?= MidasWR/ShareMTC
AUTO_COMMIT_PUSH ?= 1
COMMIT_MSG ?= chore: release $(TAG)
DIST_DIR ?= dist
INFRA_CHART_ASSET := $(DIST_DIR)/host-infra-$(TAG).tgz
SERVICES_CHART_ASSET := $(DIST_DIR)/host-services-$(TAG).tgz
INSTALLER_ASSET := $(DIST_DIR)/host-installer

SERVICES := authservice adminservice resourceservice billingservice hostagent frontend

ifeq ($(strip $(SKIP)),)
ifneq ($(origin skip), undefined)
SKIP := $(strip $(skip))
endif
endif

empty :=
space := $(empty) $(empty)
comma := ,
SKIP_ITEMS := $(strip $(subst $(comma),$(space),$(SKIP)))
has_skip = $(filter $(1),$(SKIP_ITEMS))

.PHONY: release auto-commit-push guard-tag clean-dist test build-images chart-package package-installer verify-assets github-release

release: auto-commit-push guard-tag clean-dist test build-images chart-package package-installer verify-assets github-release

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

clean-dist:
	@rm -rf "$(DIST_DIR)" && mkdir -p "$(DIST_DIR)"

test:
	@if [ "$(call has_skip,1)" = "1" ]; then \
		echo "Skipping tests"; \
	else \
		cd services/authservice && go test ./... && \
		cd ../adminservice && go test ./... && \
		cd ../resourceservice && go test ./... && \
		cd ../billingservice && go test ./...; \
	fi

build-images:
	@if [ "$(call has_skip,2)" = "2" ]; then \
		echo "Skipping container build"; \
	else \
		for svc in $(SERVICES); do \
			docker build -t $(REGISTRY)/host-$$svc:$(TAG) -f services/$$svc/Dockerfile .; \
			docker push $(REGISTRY)/host-$$svc:$(TAG); \
		done; \
	fi

chart-package:
	@if [ "$(call has_skip,3)" = "3" ]; then \
		echo "Skipping chart package"; \
	else \
		helm package charts/ChartsInfra --version $(TAG) --app-version $(TAG) -d "$(DIST_DIR)" && \
		helm package charts/ChartsServices --version $(TAG) --app-version $(TAG) -d "$(DIST_DIR)"; \
	fi

package-installer:
	@if [ "$(call has_skip,4)" = "4" ]; then \
		echo "Skipping installer package"; \
	else \
		mkdir -p "$(DIST_DIR)" && \
		cp installer/host-installer.sh "$(INSTALLER_ASSET)" && \
		chmod +x "$(INSTALLER_ASSET)"; \
	fi

verify-assets:
	@test -f "$(INSTALLER_ASSET)" || (echo "Missing installer asset: $(INSTALLER_ASSET)"; exit 1)
	@test -f "$(INFRA_CHART_ASSET)" || (echo "Missing infra chart asset: $(INFRA_CHART_ASSET)"; exit 1)
	@test -f "$(SERVICES_CHART_ASSET)" || (echo "Missing services chart asset: $(SERVICES_CHART_ASSET)"; exit 1)

github-release:
	@if [ "$(call has_skip,5)" = "5" ]; then \
		echo "Skipping GitHub release"; \
	else \
		if gh release view "$(TAG)" --repo "$(REPO)" >/dev/null 2>&1; then \
			echo "Release $(TAG) exists: overwrite assets"; \
			gh release upload "$(TAG)" "$(INSTALLER_ASSET)" "$(INFRA_CHART_ASSET)" "$(SERVICES_CHART_ASSET)" --repo "$(REPO)" --clobber && \
			gh release edit "$(TAG)" --repo "$(REPO)" --title "$(TAG)" --notes "Release $(TAG)"; \
		else \
			gh release create "$(TAG)" "$(INSTALLER_ASSET)" "$(INFRA_CHART_ASSET)" "$(SERVICES_CHART_ASSET)" --repo "$(REPO)" --title "$(TAG)" --notes "Release $(TAG)"; \
		fi; \
	fi
