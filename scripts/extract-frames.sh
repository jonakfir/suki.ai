#!/usr/bin/env bash
#
# Extract evenly-spaced frames from a skincare reveal video.
#
# Usage:
#   ./scripts/extract-frames.sh <video-file.mp4>
#
# Output:
#   public/hero-frames/frame_0001.jpg ... frame_0192.jpg
#
# Generate your source video with an AI video tool (Veo / Runway / Kling):
#
#   "Skincare products — glass serum bottles, moisturizer jars, golden
#    droppers, flower petals, and water droplets — arranged elegantly on
#    a soft powder-blue surface. The products slowly rise and explode
#    outward into floating particles and mist, with soft blue and rose
#    lighting, cinematic depth of field, luxury beauty brand aesthetic,
#    smooth slow motion, 8 seconds, 1920x1080"
#
# Then run this script on the downloaded video to extract 192 frames.

set -euo pipefail

SRC="${1:?Usage: $0 <video-file>}"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$REPO_ROOT/public/hero-frames"
TARGET_FRAMES=192
MAX_WIDTH=1280

command -v ffmpeg >/dev/null 2>&1 || { echo "ERROR: ffmpeg is required"; exit 1; }
command -v ffprobe >/dev/null 2>&1 || { echo "ERROR: ffprobe is required"; exit 1; }

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/frame_*.jpg "$OUT_DIR"/frame_*.webp 2>/dev/null || true

echo "Counting frames in $SRC..."
TOTAL_FRAMES=$(ffprobe -v error -select_streams v:0 -count_packets \
  -show_entries stream=nb_read_packets -of csv=p=0 "$SRC")
echo "Source has $TOTAL_FRAMES frames"

STEP=$(( TOTAL_FRAMES / TARGET_FRAMES ))
[ "$STEP" -lt 1 ] && STEP=1
echo "Extracting every ${STEP}th frame (target: $TARGET_FRAMES frames)"

ffmpeg -y -i "$SRC" \
  -vf "select=not(mod(n\,${STEP})),scale='min($MAX_WIDTH,iw)':-2" \
  -fps_mode vfr \
  -q:v 3 \
  -frames:v "$TARGET_FRAMES" \
  "$OUT_DIR/frame_%04d.jpg" \
  -hide_banner -loglevel warning

ACTUAL=$(ls "$OUT_DIR"/frame_*.jpg 2>/dev/null | wc -l | tr -d ' ')
echo ""
echo "Done! Extracted $ACTUAL frames to $OUT_DIR"
echo "The GlobalReveal component will automatically pick them up."
