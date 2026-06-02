#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════
# Diamond Stats — App Store Screenshot Generator
# ═══════════════════════════════════════════════════════════════════════
#
# This script boots iOS Simulators, takes screenshots, and saves them
# in the required App Store dimensions:
#   • iPhone 6.7"  (iPhone 15 Pro Max) — 1290 × 2796
#   • iPad 12.9"   (iPad Pro 12.9" 6th gen) — 2048 × 2732
#
# Prerequisites:
#   - Xcode installed with Simulators
#   - Metro running: npx expo start --dev-client
#   - App built for simulators OR using Expo Go
#
# Usage:
#   chmod +x scripts/take-screenshots.sh
#   ./scripts/take-screenshots.sh
#
# ═══════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/screenshots"

# Simulator device names (must match Xcode simulator names)
IPHONE_DEVICE="iPhone 15 Pro Max"
IPAD_DEVICE="iPad Pro (12.9-inch) (6th generation)"

# App bundle ID
BUNDLE_ID="com.dsheffer.diamondstats1"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${BLUE}📸 $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# ── Create output directories ────────────────────────────────────────
mkdir -p "$OUTPUT_DIR/iphone-6.7"
mkdir -p "$OUTPUT_DIR/ipad-12.9"

# ── Helper: get or create simulator UDID ─────────────────────────────
get_simulator_udid() {
  local device_name="$1"
  local udid
  udid=$(xcrun simctl list devices available -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    if 'iOS' not in runtime:
        continue
    for d in devices:
        if d['name'] == '$device_name' and d['state'] != 'Shutdown':
            print(d['udid'])
            sys.exit(0)
        elif d['name'] == '$device_name':
            print(d['udid'])
            sys.exit(0)
print('')
" 2>/dev/null)
  echo "$udid"
}

# ── Helper: boot simulator and wait ─────────────────────────────────
boot_sim() {
  local udid="$1"
  local name="$2"
  local state
  state=$(xcrun simctl list devices -j | python3 -c "
import json, sys
data = json.load(sys.stdin)
for runtime, devices in data['devices'].items():
    for d in devices:
        if d['udid'] == '$udid':
            print(d['state'])
            sys.exit(0)
" 2>/dev/null)

  if [ "$state" != "Booted" ]; then
    log "Booting $name..."
    xcrun simctl boot "$udid" 2>/dev/null || true
    sleep 5
  else
    log "$name already booted"
  fi
}

# ── Helper: take a screenshot ────────────────────────────────────────
take_screenshot() {
  local udid="$1"
  local output_path="$2"
  local label="$3"

  log "Taking screenshot: $label"
  xcrun simctl io "$udid" screenshot "$output_path" --type png
  success "Saved: $output_path"
}

# ── Helper: open a deep link ─────────────────────────────────────────
open_deeplink() {
  local udid="$1"
  local url="$2"
  xcrun simctl openurl "$udid" "$url"
}

# ── Main ─────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Diamond Stats — Screenshot Generator"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check Metro is running
if ! curl -s http://localhost:8081/status | grep -q "running"; then
  warn "Metro bundler doesn't seem to be running on port 8081."
  warn "Start it with: npx expo start --dev-client"
  echo ""
fi

# ── iPhone Screenshots ───────────────────────────────────────────────
log "Setting up $IPHONE_DEVICE..."
IPHONE_UDID=$(get_simulator_udid "$IPHONE_DEVICE")

if [ -z "$IPHONE_UDID" ]; then
  warn "Could not find simulator: $IPHONE_DEVICE"
  warn "Available simulators:"
  xcrun simctl list devices available | grep -E "iPhone|iPad"
  echo ""
  warn "Skipping iPhone screenshots. You can create the simulator in Xcode."
else
  boot_sim "$IPHONE_UDID" "$IPHONE_DEVICE"

  log "Opening app on iPhone..."
  xcrun simctl launch "$IPHONE_UDID" "$BUNDLE_ID" 2>/dev/null || \
    open_deeplink "$IPHONE_UDID" "diamondstats://"

  echo ""
  echo "══════════════════════════════════════════════════════════"
  echo "  INTERACTIVE MODE — iPhone 6.7\""
  echo "══════════════════════════════════════════════════════════"
  echo ""
  echo "  The simulator is running. Navigate to each screen and"
  echo "  press ENTER when ready to capture:"
  echo ""

  SCREENS=("01-home" "02-boxscore" "03-player-card" "04-standings" "05-search")
  LABELS=("Home Screen" "Box Score" "Player Card" "Standings" "Search")

  for i in "${!SCREENS[@]}"; do
    echo -n "  📱 Navigate to ${LABELS[$i]}, then press ENTER... "
    read -r
    take_screenshot "$IPHONE_UDID" "$OUTPUT_DIR/iphone-6.7/${SCREENS[$i]}.png" "${LABELS[$i]}"
  done

  success "iPhone screenshots complete!"
fi

echo ""

# ── iPad Screenshots ─────────────────────────────────────────────────
log "Setting up $IPAD_DEVICE..."
IPAD_UDID=$(get_simulator_udid "$IPAD_DEVICE")

if [ -z "$IPAD_UDID" ]; then
  warn "Could not find simulator: $IPAD_DEVICE"
  warn "Skipping iPad screenshots."
else
  boot_sim "$IPAD_UDID" "$IPAD_DEVICE"

  log "Opening app on iPad..."
  xcrun simctl launch "$IPAD_UDID" "$BUNDLE_ID" 2>/dev/null || \
    open_deeplink "$IPAD_UDID" "diamondstats://"

  echo ""
  echo "══════════════════════════════════════════════════════════"
  echo "  INTERACTIVE MODE — iPad 12.9\""
  echo "══════════════════════════════════════════════════════════"
  echo ""

  SCREENS=("01-home" "02-boxscore" "03-player-card" "04-standings" "05-search")
  LABELS=("Home Screen" "Box Score" "Player Card" "Standings" "Search")

  for i in "${!SCREENS[@]}"; do
    echo -n "  📱 Navigate to ${LABELS[$i]}, then press ENTER... "
    read -r
    take_screenshot "$IPAD_UDID" "$OUTPUT_DIR/ipad-12.9/${SCREENS[$i]}.png" "${LABELS[$i]}"
  done

  success "iPad screenshots complete!"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Done! Screenshots saved to:"
echo "    $OUTPUT_DIR/"
echo ""
echo "  iPhone 6.7\":  $OUTPUT_DIR/iphone-6.7/"
echo "  iPad 12.9\":   $OUTPUT_DIR/ipad-12.9/"
echo ""
echo "  Upload these to App Store Connect under"
echo "  'App Information > Screenshots'"
echo "═══════════════════════════════════════════════════════════"
