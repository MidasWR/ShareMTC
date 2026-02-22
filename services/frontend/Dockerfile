FROM node:22-alpine AS builder
WORKDIR /app
COPY services/frontend/package.json ./
COPY services/frontend/tsconfig.json ./
COPY services/frontend/vite.config.ts ./
COPY services/frontend/tailwind.config.js ./
COPY services/frontend/postcss.config.js ./
COPY services/frontend/index.html ./
COPY services/frontend/src ./src
RUN npm install && npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
