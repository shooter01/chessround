# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
# копируем lock, если он есть
COPY package.json package-lock.json* ./
# если есть package-lock.json -> npm ci, иначе обычный install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# ---------- DEV (hot-reload) ----------
FROM base AS dev
RUN npm i -D nodemon tsx
COPY . .
EXPOSE 8080
CMD ["npm","run","dev:docker"]

# ---------- BUILD ----------
FROM base AS build
COPY . .
RUN npm run build

# ---------- PROD ----------
FROM node:20-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD ["node","dist/server.js"]
