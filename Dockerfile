FROM node:20-slim AS base

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/
COPY config/ ./config/

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/api/index.js"]
