FROM node:22-alpine AS deps
WORKDIR /app
COPY services/bff/package.json services/bff/package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY services/bff/ ./
COPY proto ./proto
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV IDENTITY_PROTO_PATH=/app/proto/identity/v1/identity.proto
ENV QUIZ_BANK_PROTO_ROOT=/app/proto
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/proto ./proto
EXPOSE 3001
CMD ["node", "dist/main.js"]
