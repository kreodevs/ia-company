# Frontend is an npm workspace — lockfile lives at repo root.
# Base images from AWS ECR Public (Docker Library mirror).

FROM public.ecr.aws/docker/library/node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY frontend/package.json ./frontend/
RUN npm ci --workspace=frontend --include-workspace-root=false --ignore-scripts
COPY frontend ./frontend
WORKDIR /app/frontend
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM public.ecr.aws/docker/library/nginx:1.27-alpine AS runner
RUN apk add --no-cache wget
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
