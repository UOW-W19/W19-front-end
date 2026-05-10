# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Build-time env vars for Vite (baked into the static bundle)
ARG VITE_GOOGLE_PLACES_KEY
ARG VITE_ENABLE_PWA=false
ENV VITE_GOOGLE_PLACES_KEY=$VITE_GOOGLE_PLACES_KEY
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA

# Cache node_modules layer
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ─── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config (SPA routing + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
