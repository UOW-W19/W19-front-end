# --- Stage 1: Build ---
FROM node:20-alpine AS builder

ARG VITE_GOOGLE_PLACES_KEY
ARG VITE_ENABLE_PWA=false
ENV VITE_GOOGLE_PLACES_KEY=$VITE_GOOGLE_PLACES_KEY
ENV VITE_ENABLE_PWA=$VITE_ENABLE_PWA

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Stage 2: Serve with nginx ---
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

RUN printf 'server {\n    listen 80;\n    root /usr/share/nginx/html;\n    index index.html;\n    location /api/ {\n        proxy_pass http://backend:8081/api/;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
