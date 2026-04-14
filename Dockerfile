# This Dockerfile uses `serve` npm package to serve the static files with node process.
# You can find the Dockerfile for nginx in the following link:
# https://github.com/refinedev/dockerfiles/blob/main/vite/Dockerfile.nginx
FROM node:20-bookworm-slim AS base

WORKDIR /app

FROM base as deps

COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* .npmrc* ./

RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM base as builder

ENV NODE_ENV production

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN npm run build

FROM base as runner

ENV NODE_ENV production

RUN npm install -g serve

COPY --from=builder /app/dist ./

USER node

CMD ["sh", "-c", "serve -s . -l tcp://0.0.0.0:${PORT:-3000}"]
