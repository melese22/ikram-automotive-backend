FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM node:22-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
EXPOSE 5000
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
