# Everything installed here lands in a Docker image layer, and image layers are
# reused by "Rebuild Container". postCreateCommand gets no such caching -- it
# runs from scratch on every rebuild -- so system packages belong here and not
# there. That is the whole reason this file exists: the apt work below used to
# live in post-create.sh and was paid for on every single rebuild.
#
# (The devcontainer "features" in devcontainer.json are also baked into layers
# on top of this one, so they were never the slow part.)
ARG VARIANT=5-24-trixie
FROM mcr.microsoft.com/devcontainers/typescript-node:${VARIANT}

ENV DEBIAN_FRONTEND=noninteractive

# LuaLaTeX and Atkinson Hyperlegible Next, for bnb-latex / bnb-cli --pdf.
ARG ATKINSON_FONT_COMMIT=7925f50f649b3813257faf2f4c0b381011f434f1
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		curl \
		fontconfig \
		texlive-latex-base \
		texlive-latex-recommended \
		texlive-luatex \
	&& install -d /usr/local/share/fonts/atkinson-hyperlegible-next \
	&& curl --fail --location --silent --show-error \
		"https://raw.githubusercontent.com/googlefonts/atkinson-hyperlegible-next/${ATKINSON_FONT_COMMIT}/fonts/variable/AtkinsonHyperlegibleNext%5Bwght%5D.ttf" \
		--output "/usr/local/share/fonts/atkinson-hyperlegible-next/AtkinsonHyperlegibleNext[wght].ttf" \
	&& curl --fail --location --silent --show-error \
		"https://raw.githubusercontent.com/googlefonts/atkinson-hyperlegible-next/${ATKINSON_FONT_COMMIT}/fonts/variable/AtkinsonHyperlegibleNext-Italic%5Bwght%5D.ttf" \
		--output "/usr/local/share/fonts/atkinson-hyperlegible-next/AtkinsonHyperlegibleNext-Italic[wght].ttf" \
	&& fc-cache --force \
	&& luaotfload-tool --update \
	&& rm -rf /var/lib/apt/lists/*

# Playwright's chromium needs two separate things:
#   - the browser build (~650MB), which lives in the named volume at
#     PLAYWRIGHT_BROWSERS_PATH (see devcontainer.json) and survives a rebuild
#   - its shared libraries (libnss3, libasound2, ...), which are plain apt
#     packages in the container filesystem and did not survive a rebuild
# Baking the second set here is what makes the `playwright install --with-deps
# chromium` in deferred-setup.sh a no-op on the apt side.
#
# Pinned to the @playwright/test version in packages/bnb-web/package.json --
# bump the two together. Playwright refuses to guess the dep list for a distro
# it doesn't know, so this also fails loudly if the base image moves to a
# Debian release that release of Playwright hasn't got a list for.
ARG PLAYWRIGHT_VERSION=1.62.1
RUN npx --yes playwright-core@${PLAYWRIGHT_VERSION} install-deps chromium \
	&& rm -rf /var/lib/apt/lists/* /root/.npm
