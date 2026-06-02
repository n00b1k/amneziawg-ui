#!/bin/sh

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