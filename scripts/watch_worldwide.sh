#!/usr/bin/env bash
# Polls multiple App Store storefronts for Diamond Stats until it goes live worldwide.
# Reasonable cadence: every 5 min for first hour, then every 15 min.
# On first hit anywhere, notifies. Keeps polling until 5+ stores confirm worldwide rollout.

APP_ID="6762099221"
STORES=(us gb ca au de fr jp it es nl mx br in)
LOGFILE="scripts/watch_live.log"
START=$(date +%s)
FIRST_HIT=0
WORLDWIDE_HIT=0

notify() {
  osascript -e "display notification \"$2\" with title \"$1\" sound name \"Glass\"" 2>/dev/null
  say "$2" 2>/dev/null &
}

mkdir -p "$(dirname "$LOGFILE")"
echo "=== Watch started $(date) ===" | tee -a "$LOGFILE"

while true; do
  hits=()
  for s in "${STORES[@]}"; do
    n=$(curl -s --max-time 8 "https://itunes.apple.com/lookup?id=${APP_ID}&country=${s}" \
        | python3 -c "import json,sys;print(json.load(sys.stdin).get('resultCount',0))" 2>/dev/null)
    [ "$n" = "1" ] && hits+=("$s")
  done

  ts=$(date "+%Y-%m-%d %H:%M:%S")
  count=${#hits[@]}
  total=${#STORES[@]}
  line="[$ts] live in $count/$total : ${hits[*]:-none}"
  echo "$line" | tee -a "$LOGFILE"

  if [ "$count" -ge 1 ] && [ "$FIRST_HIT" -eq 0 ]; then
    FIRST_HIT=1
    notify "Diamond Stats" "First storefront live: ${hits[0]}"
    open "https://apps.apple.com/${hits[0]}/app/id${APP_ID}"
  fi

  if [ "$count" -ge 5 ] && [ "$WORLDWIDE_HIT" -eq 0 ]; then
    WORLDWIDE_HIT=1
    notify "Diamond Stats" "Now live in $count storefronts worldwide!"
  fi

  if [ "$count" -ge 10 ]; then
    echo "[$ts] worldwide rollout complete ($count/$total). Stopping." | tee -a "$LOGFILE"
    notify "Diamond Stats" "Worldwide rollout complete ($count/$total)"
    exit 0
  fi

  elapsed=$(( $(date +%s) - START ))
  if [ "$elapsed" -lt 3600 ]; then
    sleep 300   # first hour: every 5 min
  else
    sleep 900   # after: every 15 min
  fi
done
