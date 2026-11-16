#!/bin/sh
# Publish the committed web/ folder to GitHub Pages (branch gh-pages).
set -e
cd "$(dirname "$0")"
git push origin "$(git subtree split --prefix web HEAD):refs/heads/gh-pages" --force
