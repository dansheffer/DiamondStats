#!/usr/bin/env bash
# Watches the App Store until Diamond Stats goes live, then beeps + macOS banner.
URL="https://apps.apple.com/us/app/id6762099221"
echo "Watching $URL ..."
while true; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -L "$URL")
  ts=$(date "+%H:%M:%S")
  echo "[$ts] HTTP $code"
  if [ "$code" = "200" ]; then
    osascript -e 'display notification "Diamond Stats is LIVE on the App Store!" with title "Diamond Stats" sound name "Glass"'
    say "Diamond Stats is live on the App Store"
    open "$URL"
    exit 0
  fi
  sleep 60
done
