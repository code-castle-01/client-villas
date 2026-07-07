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

CMD ["serve", "-s", "dist"]
