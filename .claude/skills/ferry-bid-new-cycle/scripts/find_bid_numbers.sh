#!/usr/bin/env bash
# usage: find_bid_numbers.sh <bidNNN-folder> <old-target> [old-template] [old-prev]
# Lists every line in the copied tooling that still names the previous cycle's numbers, so nothing is missed
# when re-pointing patch.py, build.py, cycle.js, tests and the UX map at the new bid.
# Example after copying bid197 -> bid198:  find_bid_numbers.sh bid198 197 196 195
set -u
dir=${1:?folder}; t=${2:?old target bid}; s=${3:-}; p=${4:-}
pat="$t"; [ -n "$s" ] && pat="$pat|$s"; [ -n "$p" ] && pat="$pat|$p"
grep -rnE "($pat)" "$dir"/patch.py "$dir"/build.py "$dir"/cycle.js "$dir"/extra.js "$dir"/extra.css \
  "$dir"/tests/*.js "$dir"/tests/*.py "$dir"/ux-map.json "$dir"/README.md "$dir"/UX-MAP.md 2>/dev/null | cut -c1-200
