# Deploy — MOOV Chat

## Arquitetura de Produção

```
┌─────────────────────────────────────────────────┐
│                 VPS Hostinger                   │
│                                                 │
│  ┌─────────────────┐   ┌─────────────────────┐ │
│  │  Evolution API  │   │      n8n             │ │
│  │  (WhatsApp GW)  │   │  (Automações)        │ │
│  │  Port 8080      │   │  Port 5678           │ │
│  └────────┬────────┘   └──────────┬──────────┘ │
│           │                       │             │
│           └──────────┬────────────┘             │
│                      │ webhook                  │
└──────────────────────┼──────────────────────────┘
                       │
              ┌────────▼────────┐
              │   Supabase DB   │
              │  (PostgreSQL)   │
              └────────▲────────┘
                       │
              ┌────────┴────────┐
              │  Next.js App    │
              │  (Docker/VPS)   │
              │  Port 3000      │
              └─────────────────┘
                       │
              ┌────────▼────────┐
              │  Nginx Reverse  │
              │  Proxy + TLS    │
              └─────────────────┘
```

---

## 1. Pré-requisitos

| Serviço | Onde |
|---------|------|
| VPS Hostinger | 2 vCPU / 4 GB RAM mínimo |
| Supabase | Projeto criado + Connection String |
| Evolution API | Rodando na VPS (porta 8080) |
| n8n | Rodando na VPS (porta 5678) |
| Domínio | Apontado para IP da VPS |

---

## 2. Variáveis de Ambiente

Crie `/opt/moov-chat/.env` na VPS:

```bash
# ─── Banco de Dados (Supabase) ───────────────────
# Use porta 6543 (PgBouncer) para a app
DATABASE_URL="postgresql://postgres.[ref]:[senha]@aws-0-[região].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=10"
# Use porta 5432 (direto) para migrations
DIRECT_URL="postgresql://postgres.[ref]:[senha]@aws-0-[região].pooler.supabase.com:5432/postgres"

# ─── NextAuth ────────────────────────────────────
NEXTAUTH_SECRET="$(openssl rand -hex 32)"
NEXTAUTH_URL="https://app.seudominio.com.br"

# ─── Evolution API ───────────────────────────────
EVOLUTION_API_URL="https://evolution.seudominio.com.br"
EVOLUTION_API_KEY="sua-chave-secreta"

# ─── n8n ─────────────────────────────────────────
N8N_BASE_URL="https://n8n.seudominio.com.br"
N8N_WEBHOOK_SECRET="segredo-compartilhado"

# ─── OpenAI ──────────────────────────────────────
OPENAI_API_KEY="sk-..."
```

---

## 3. Deploy da Aplicação Next.js (Docker)

### 3.1 Build da imagem

```bash
# Na raiz do projeto
docker build -t moov-chat:latest .
```

### 3.2 Rodar o container

```bash
docker run -d \
  --name moov-chat \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /opt/moov-chat/.env \
  moov-chat:latest
```

### 3.3 Rodar migrações do banco

Execute uma vez (ou após cada deploy que tiver novas migrações):

```bash
docker run --rm \
  --env-file /opt/moov-chat/.env \
  moov-chat:latest \
  npx prisma migrate deploy
```

---

## 4. Nginx — Reverse Proxy com TLS

### 4.1 Instalar Nginx + Certbot

```bash
apt update && apt install -y nginx certbot python3-certbot-nginx
```

### 4.2 Configuração do virtual host

`/etc/nginx/sites-available/moov-chat`:

```nginx
server {
    listen 80;
    server_name app.seudominio.com.br;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/moov-chat /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# TLS com Let's Encrypt
certbot --nginx -d app.seudominio.com.br
```

---

## 5. Evolution API na VPS

### 5.1 Docker Compose para Evolution API

`/opt/evolution/docker-compose.yml`:

```yaml
version: '3.8'
services:
  evolution:
    image: atendai/evolution-api:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      SERVER_URL: "https://evolution.seudominio.com.br"
      AUTHENTICATION_TYPE: "apikey"
      AUTHENTICATION_API_KEY: "sua-chave-secreta"
      STORE_MESSAGES: "true"
      STORE_MESSAGE_UP: "true"
      DATABASE_ENABLED: "false"
      WEBHOOK_GLOBAL_ENABLED: "false"
    volumes:
      - evolution_data:/evolution/instances
volumes:
  evolution_data:
```

```bash
cd /opt/evolution && docker compose up -d
```

### 5.2 Configurar webhook por instância

Após criar uma instância via admin (ou API), o webhook é configurado automaticamente pelo MOOV Chat apontando para:

```
https://app.seudominio.com.br/api/webhooks/whatsapp/[tenantSlug]
```

---

## 6. n8n na VPS

### 6.1 Docker para n8n

```bash
docker run -d \
  --name n8n \
  --restart unless-stopped \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD="senha-forte" \
  -e N8N_HOST="n8n.seudominio.com.br" \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=https \
  -e WEBHOOK_URL="https://n8n.seudominio.com.br" \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest
```

### 6.2 Importar flows

1. Acesse `https://n8n.seudominio.com.br`
2. Settings → Import from File
3. Importe cada arquivo de `docs/n8n/` (adapte os pseudocódigos para nodes reais do n8n)
4. Configure as credenciais (OpenAI, Evolution API, Supabase)

---

## 7. Atualização (Rolling Deploy)

```bash
# 1. Pull da nova imagem
docker build -t moov-chat:latest .

# 2. Rodar migrações (se houver)
docker run --rm --env-file /opt/moov-chat/.env moov-chat:latest npx prisma migrate deploy

# 3. Restart do container
docker stop moov-chat && docker rm moov-chat

docker run -d \
  --name moov-chat \
  --restart unless-stopped \
  -p 3000:3000 \
  --env-file /opt/moov-chat/.env \
  moov-chat:latest
```

---

## 8. Checklist de Go-Live

- [ ] Variáveis de ambiente configuradas em `/opt/moov-chat/.env`
- [ ] Banco de dados Supabase criado e migrações rodadas
- [ ] Domínio apontando para IP da VPS (DNS propagado)
- [ ] TLS ativo via Certbot
- [ ] Evolution API rodando e webhook configurado por tenant
- [ ] n8n rodando e flows importados/ativados
- [ ] Primeiro SUPER_ADMIN criado diretamente no banco:
  ```sql
  INSERT INTO "User" (id, email, name, "passwordHash", role, status, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'admin@moov.chat', 'Super Admin', crypt('senha', gen_salt('bf')), 'SUPER_ADMIN', 'ACTIVE', now(), now());
  ```
- [ ] Login testado em produção
- [ ] Primeiro tenant criado via admin
