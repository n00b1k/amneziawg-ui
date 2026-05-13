### run

docker run --rm n00b1k/amneziawg-ui:latest gph 'password'
-e ADMIN_PASSWORD_HASH='$2b$12$p4YhOrFCPZGwcZXj92aiAejI8sksU46lQiwlJPzSzKvh7moxju3v2'

Place manual certificates key.pem and cert.pem in the catalog
/opt/amneziawg-ui/certs

```
docker run -d \
  --name amneziawg-ui \
  -p 5000:5000 \
  -p 51820:51820/udp \
  -v /opt/amneziawg-ui:/etc/amnezia \
  -v /opt/amneziawg-ui/certs:/app/certs \
  -e ADMIN_USERNAME=user \
  -e ADMIN_PASSWORD_HASH='$2b$12$p4YhOrFCPZGwcZXj92aiAejI8sksU46lQiwlJPzSzKvh7moxju3v2' \
  -e DEFAULT_MTU=1420 \
  -e DEFAULT_SUBNET=192.168.99.0/24 \
  -e DEFAULT_PORT=51820 \
  -e DEFAULT_DNS="1.1.1.1,9.9.9.9" \
  --cap-add=NET_ADMIN \
  --cap-add SYS_MODULE \
  --sysctl net.ipv4.ip_forward=1 \
  --sysctl net.ipv4.conf.all.src_valid_mark=1 \
  --device /dev/net/tun \
  --restart unless-stopped \
  n00b1k/amneziawg-ui:latest
```
