# ---- Stage 1: Build client ----
FROM node:20-alpine AS client-build
WORKDIR /build
COPY shared ./shared
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

# ---- Stage 2: Build server ----
FROM node:20-alpine AS server-build
WORKDIR /build
COPY shared ./shared
COPY server/package*.json ./server/
RUN cd server && npm ci
COPY server ./server
RUN cd server && npm run build

# ---- Stage 3: Production ----
FROM node:20-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY --from=server-build /build/server/dist ./dist
# index.ts: path.resolve(__dirname, '../../client/dist') → dist/client/dist
COPY --from=client-build /build/client/dist ./dist/client/dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/server/src/index.js"]
