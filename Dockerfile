FROM golang:alpine3.22 AS builder
RUN apk add --no-cache git make gcc musl-dev linux-headers
RUN git clone https://github.com/amnezia-vpn/amneziawg-go.git && cd amneziawg-go && make && make install
RUN git clone https://github.com/amnezia-vpn/amneziawg-tools.git && cd amneziawg-tools/src && make && make WITH_WGQUICK=yes install

FROM alpine:3.22

COPY --from=builder /usr/bin/amneziawg-go /usr/bin/amneziawg-go
COPY --from=builder /usr/bin/awg /usr/bin/awg
COPY --from=builder /usr/bin/awg-quick /usr/bin/awg-quick

RUN apk update && apk add \
    python3 \
    py3-pip \
    curl \
    iptables \
    iptables-legacy \
    bash \
    iproute2 \
    openresolv \
    openssl \
    && rm -rf /var/cache/apk/*

RUN pip3 install flask flask_socketio flask-login bcrypt requests python-socketio waitress --break-system-packages

COPY web-ui /app/web-ui/

# Копируем скрипты
COPY scripts/ /app/scripts/
RUN chmod +x /app/scripts/*.sh

# Создаем символическую ссылку для команды gph
RUN ln -s /app/web-ui/generate_password_hash.py /usr/local/bin/gph && chmod +x /usr/local/bin/gph

# Переменные окружения
ENV PRODUCTION=false \
    AUTO_START_SERVERS=true \
    DEFAULT_MTU=1420 \
    DEFAULT_SUBNET=192.168.99.0/24 \
    DEFAULT_PORT=51820 \
    DEFAULT_DNS="1.1.1.1,9.9.9.9"

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f -k https://localhost:5000/health || exit 1

# Entrypoint для поддержки команды gph
ENTRYPOINT ["app/scripts/entrypoint.sh"]