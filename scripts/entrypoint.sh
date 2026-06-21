#!/bin/sh

if [ -n "$TZ" ] && [ -f "/usr/share/zoneinfo/$TZ" ]; then
    ln -sf /usr/share/zoneinfo/$TZ /etc/localtime
    echo "Timezone set to $TZ"
else
    echo "Timezone UTC (default)"
fi

# Если первый аргумент "gph", то запускаем генератор пароля
if [ "$1" = "gph" ]; then
    shift
    exec python3 /app/web-ui/generate_password_hash.py "$@"
fi

while true; do
    echo "[$(date -Iseconds)] Starting Flask application..."
    python3 /app/web-ui/app.py
    echo "[$(date -Iseconds)] Flask crashed or exited. Restarting in 2 seconds..." >&2
    sleep 2
done