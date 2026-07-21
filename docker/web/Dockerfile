# syntax=docker/dockerfile:1
# Frontend is an npm workspace — lockfile lives at repo root.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/
RUN npm ci --workspace=frontend --include-workspace-root=false --ignore-scripts
COPY frontend ./frontend
WORKDIR /app/frontend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
RUN apk add --no-cache wget
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
