#!/usr/bin/env bash
# Mirror the entire CricAI site into a local folder.
# Usage: ./mirror_site.sh

set -e

TARGET_URL="https://cricanalysis.b12sites.com/"
echo "Mirroring $TARGET_URL ..."
wget \
  --mirror \
  --convert-links \
  --page-requisites \
  --adjust-extension \
  --no-parent \
  --user-agent="Mozilla/5.0" \
  "$TARGET_URL"

echo "Done! Local copy lives in ./cricanalysis.b12sites.com/"
