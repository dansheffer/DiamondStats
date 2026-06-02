#!/usr/bin/env bash
# Single poll: check whether Diamond Stats is live in 13 storefronts.
# Designed to be run by launchd hourly. Notifies on first appearance
# and on worldwide rollout, then disables itself.

APP_ID="6762099221"
STORES=(us gb ca au de fr jp it es nl mx br in)
LOGDIR="$HOME/CODE/DiamondStats/scripts"
LOGFILE="$LOGDIR/poll_live.log"
STATEFILE="$LOGDIR/.poll_live.state"
PLIST="$HOME/Library/LaunchAgents/com.dsheffer.diamondstats.watch.plist"

mkdir -p "$LOGDIR"
prev_state="none"
[ -f "$STATEFILE" ] && prev_state=$(cat "$STATEFILE")

notify() {
  /usr/bin/osascript -e "display notification \"$2\" with title \"$1\" sound name \"Glass\"" 2>/dev/null
  /usr/bin/say "$2" 2>/dev/null &
}

hits=()
for s in "${STORES[@]}"; do
  n=$(/usr/bin/curl -s --max-time 8 "https://itunes.apple.com/lookup?id=${APP_ID}&country=${s}" \
      | /usr/bin/python3 -c "import json,sys;print(json.load(sys.stdin).get('resultCount',0))" 2>/dev/null)
  [ "$n" = "1" ] && hits+=("$s")
done
count=${#hits[@]}
ts=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$ts] live in $count/${#STORES[@]} : ${hits[*]:-none}" >> "$LOGFILE"

# State transitions
if [ "$count" -ge 1 ] && [ "$prev_state" = "none" ]; then
  notify "Diamond Stats LIVE" "First storefront: ${hits[0]}. Opening App Store."
  /usr/bin/open "https://apps.apple.com/${hits[0]}/app/id${APP_ID}"
  echo "first_hit" > "$STATEFILE"
fi

if [ "$count" -ge 5 ] && [ "$prev_state" != "worldwide" ] && [ "$prev_state" != "complete" ]; then
  notify "Diamond Stats" "Now live in $count storefronts worldwide!"
  echo "worldwide" > "$STATEFILE"
fi

if [ "$count" -ge 10 ]; then
  notify "Diamond Stats" "Worldwide rollout complete ($count/${#STORES[@]}). Stopping poller."
  echo "complete" > "$STATEFILE"
  # Self-disable so we stop nagging Apple
  /bin/launchctl unload "$PLIST" 2>/dev/null
fi
