# Builder
FROM node:19-alpine3.16 AS builder
RUN apk add --no-cache libc6-compat git
RUN apk update
WORKDIR /usr/src
RUN npm install -g turbo
COPY . .
RUN turbo prune --scope=api --docker

# Installer
FROM node:19-alpine3.16 AS installer
RUN apk add --no-cache libc6-compat git
RUN apk update
WORKDIR /usr/src

COPY --from=builder /usr/src/out/json/ .
COPY --from=builder /usr/src/out/package-lock.json ./package-lock.json
RUN npm ci

COPY --from=builder /usr/src/out/full/ .
COPY turbo.json turbo.json
RUN npx turbo run build --filter=api...

# Runner
FROM node:19-alpine3.16 AS runner
WORKDIR /usr/src

RUN addgroup --system --gid 1001 nestjs
RUN adduser --system --uid 1001 nestjs
COPY --from=installer /usr/src .
USER nestjs

CMD ["npm", "run", "start", "--prefix", "apps/api"]
