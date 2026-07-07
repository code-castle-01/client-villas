# Serve static Vite build with Node on Railway.
FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./

# Install on Linux so optional native deps (lightningcss) match the build platform.
RUN npm ci

COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]
