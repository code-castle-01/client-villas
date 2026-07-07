# Serve static Vite build with Node on Railway.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN npm install -g serve@14.2.6

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

# Railway injects PORT at runtime. Shell form is required to expand it.
CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"]
