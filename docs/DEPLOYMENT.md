# AETHERFALL 1.0.0 — Production Server Deployment & Operations Guide
**Project:** One World. One Realm. Every Player.  
**Version:** 1.0.0  
**Backend:** Node.js 22+ Authoritative WebSocket Server with Native SQLite WAL Persistence

---

## 1. Production Architecture Overview

AETHERFALL 1.0.0 operates as an authoritative single-realm MMORPG. Browser clients connect via secure WebSockets (`wss://`) through a reverse proxy (Nginx or Caddy) to the dedicated Node.js game server.

```
       [ Modern Web Browsers / Standalone Clients ]
                            │
               HTTPS / WSS (Port 443)
                            ▼
              [ Nginx Reverse Proxy / SSL ]
               ├── /        --> Vite Static Bundle / Client Assets
               ├── /health  --> HTTP Server (Health JSON & Monitoring)
               └── /ws      --> WebSocket Game Server (Port 7777)
                            │
              [ Authoritative Server Process ]
               ├── 20Hz Physics & World Loop
               ├── 10Hz Spatial Grid Broadcast (64m cells)
               ├── Server-Authoritative Combat & Reactions
               └── Native SQLite WAL Database (`aetherfall_realm.db`)
```

---

## 2. Server Requirements & Operating Costs

### Hardware Specifications:
- **Baseline (up to 100 concurrent players):** 1 vCPU, 2 GB RAM, 20 GB NVMe SSD.
- **Recommended (up to 500+ concurrent players):** 2 vCPU, 4 GB RAM, 40 GB NVMe SSD.
- **High-Capacity Realm (up to 2,000 concurrent players):** 4 vCPU, 8 GB RAM, 80 GB NVMe SSD.

### Operating Cost Estimate:
| Component | Provider / Tier | Monthly Cost |
|---|---|---|
| Cloud Compute VPS | Hetzner Cloud (CX22 / CPX21) or DigitalOcean Droplet | $5.00 – $14.00 |
| Domain Name & DNS | Cloudflare (Free DNS & DDoS protection) + Registrar | ~$1.00 ($12/year) |
| SSL/TLS Certificate | Let's Encrypt (Certbot Automated Renewal) | $0.00 (Free) |
| Offsite Backups | Wasabi / Backblaze B2 (Daily encrypted DB snapshots) | < $1.00 |
| **Total Estimated Operating Cost** | **Dedicated Realm for Hundreds of Players** | **~$7 – $15 / month** |

---

## 3. Environment Configuration

Create a `.env` file in the project root:

```ini
NODE_ENV=production
PORT=7777
DB_PATH=/var/data/aetherfall/aetherfall_realm.db
HOST=0.0.0.0
ALLOWED_ORIGIN=https://play.aetherfall.com
LOG_LEVEL=info
```

---

## 4. Turn-Key Deployment: Docker & Docker Compose

### 4.1. Run with Docker Compose
```bash
# Build and launch authoritative server in background
docker compose up -d --build

# View real-time server logs
docker compose logs -f
```

---

## 5. Linux Host Deployment (systemd)

For native Linux deployment without Docker:

### 5.1. Build Production Assets
```bash
npm install --frozen-lockfile
npm run build
npm run server:build
```

### 5.2. Install systemd Service (`/etc/systemd/system/aetherfall.service`)
```ini
[Unit]
Description=Aetherfall 1.0.0 Global Realm Server
After=network.target

[Service]
Type=simple
User=aetherfall
WorkingDirectory=/opt/aetherfall
ExecStart=/usr/bin/node server/server.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=7777
Environment=DB_PATH=/var/data/aetherfall/aetherfall_realm.db
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable aetherfall
sudo systemctl start aetherfall
sudo systemctl status aetherfall
```

---

## 6. Reverse Proxy & SSL/TLS Configuration (Nginx)

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name play.aetherfall.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name play.aetherfall.com;

    ssl_certificate /etc/letsencrypt/live/play.aetherfall.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/play.aetherfall.com/privkey.pem;

    # Static Web Client
    root /opt/aetherfall/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Authoritative WebSocket Realm Server
    location /ws {
        proxy_pass http://127.0.0.1:7777;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Realm Health & Monitoring Endpoint
    location /health {
        proxy_pass http://127.0.0.1:7777/health;
        proxy_set_header Host $host;
    }
}
```

---

## 7. Automated Database Backups (SQLite WAL)

Because SQLite operates in `WAL` mode, hot backups can be taken safely without interrupting active gameplay using the native vacuum/backup command:

Install daily cron job (`/etc/cron.daily/aetherfall-backup`):
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/aetherfall"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
sqlite3 /var/data/aetherfall/aetherfall_realm.db ".backup '$BACKUP_DIR/realm_$DATE.db'"
gzip "$BACKUP_DIR/realm_$DATE.db"
# Retain last 14 days
find "$BACKUP_DIR" -type f -name "*.db.gz" -mtime +14 -delete
```

---

## 8. Health Monitoring & Operational Alerts

Query the server health endpoint:
```bash
curl -s http://127.0.0.1:7777/health
```
Response:
```json
{
  "status": "online",
  "realm": "Aetherfall Global",
  "version": "1.0.0",
  "onlinePlayers": 42,
  "uptime": 86420.5,
  "tick": 1728410
}
```
