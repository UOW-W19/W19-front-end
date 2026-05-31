# Deployment Guide

This frontend is a Vite static app, but the product is not static-only. For users to interact with Locale, you must also deploy the Spring Boot backend, PostgreSQL, and the Python vision service from `../W19-back-end`.

## Recommended Path: One Server And One Domain

The current repos are already shaped for this: run the backend repo's Docker Compose stack on a server, then put HTTPS in front of the frontend container.

1. Provision a small Linux server with Docker and Docker Compose.
2. Point a domain or subdomain at the server, for example `locale.example.com`.
3. Clone both repos side-by-side:

```bash
~/apps/
  W19-back-end/
  W19-front-end/
```

4. In `W19-back-end`, create `.env` from `.env.example` and fill in real values:

```bash
cp .env.example .env
```

Required for a public deployment:

```bash
JWT_SECRET=use_a_long_random_secret
GOOGLE_PLACES_KEY=your_google_places_key
GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
VITE_MAPBOX_TOKEN=your_mapbox_public_token
ALLOWED_ORIGINS=https://locale.example.com

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-2
AWS_S3_BUCKET_CUSTOMER=...
AWS_CLOUDFRONT_DOMAIN=...
AWS_S3_MOCK=false

WEB_PUSH_ENABLED=true
WEB_PUSH_VAPID_PUBLIC_KEY=your_vapid_public_key
WEB_PUSH_VAPID_PRIVATE_KEY=your_vapid_private_key
WEB_PUSH_VAPID_SUBJECT=mailto:admin@locale.app
```

For this same-domain Docker deployment, leave these unset unless you are intentionally hosting the backend elsewhere:

```bash
VITE_API_BASE_URL=
VITE_WS_URL=
```

5. Start the full stack from the backend repo:

```bash
cd ~/apps/W19-back-end
docker compose up -d --build
```

6. Put HTTPS in front of the frontend container. With Caddy on the host:

```caddyfile
locale.example.com {
  reverse_proxy localhost:8080
}
```

Only expose ports `80` and `443` publicly. Keep PostgreSQL, the backend port, and the vision-service port private behind the server firewall.

## Free Phone Demo With Cloudflare Quick Tunnel

Use this when you want to test the app from a phone without paying for hosting. It creates a temporary public HTTPS URL that forwards to the local frontend container.

From the backend repo:

```powershell
cd ..\W19-back-end
.\scripts\start-phone-tunnel.ps1 -Build
```

The script starts the Docker Compose stack, creates a Cloudflare Quick Tunnel container, prints a `https://...trycloudflare.com` URL, and copies it to your clipboard when possible. Open that URL on your phone.

Use `-Build` after frontend/backend changes. If the stack is already current, this is enough:

```powershell
.\scripts\start-phone-tunnel.ps1
```

Stop the public tunnel when you finish testing:

```powershell
.\scripts\start-phone-tunnel.ps1 -Stop
```

Cloudflare Quick Tunnels are for development and demos. The URL is temporary and changes when you restart the tunnel.

## Production Profile

The backend has a `prod` profile, but only turn it on after the production database schema is ready:

```bash
SPRING_PROFILES_ACTIVE=prod
ALLOWED_ORIGINS=https://locale.example.com
```

The default local profile uses development-friendly behavior like schema updates and seed data. That is useful for a class demo, but it is not the right long-term production setup.

## Split Hosting Option

If you deploy the frontend to a static host and the backend somewhere else, set these Vite build-time variables on the frontend host:

```bash
VITE_API_BASE_URL=https://api.example.com/api
VITE_WS_URL=wss://api.example.com/ws-native
VITE_MAPBOX_TOKEN=your_mapbox_public_token
```

Then set the backend CORS origin to the frontend URL:

```bash
ALLOWED_ORIGINS=https://locale.example.com
```

Rebuild the frontend whenever any `VITE_*` value changes because Vite bakes those values into the generated static files.

## PWA Notes

The frontend builds as an installable Progressive Web App by default. Keep it behind HTTPS for public deployments; browser install prompts and service workers require HTTPS except on localhost.

Set `VITE_ENABLE_PWA=false` only for debugging service-worker caching during development.

## Smoke Test Checklist

After deployment:

- Open `https://locale.example.com`.
- Register or log in.
- Create and view posts.
- Open messages and confirm real-time chat/typing still connects.
- Open Settings → Notifications and confirm this browser can subscribe to push notifications.
- Open Explore and confirm maps and nearby learner/meetup requests work.
- Upload or scan an image if the scanner is part of the demo.
- Open Settings -> Install App and confirm the browser offers an install flow on a supported device.
- Reload once while offline and confirm the app shell loads with the offline banner.
- Check backend logs with `docker compose logs -f backend`.
