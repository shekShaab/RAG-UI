# RAG Platform UI

Next.js admin interface for the custom RAG solution.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — stats, recent docs, system health |
| `/documents` | Upload files + manage the knowledge base |
| `/query` | Chat interface with streaming + source references |
| `/categories` | Create and configure knowledge categories |
| `/settings` | API connection, model info, chunking reference |

## Setup

```bash
# 1. install
npm install

# 2. configure
cp .env.local.example .env.local
# edit .env.local — set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_API_KEY

# 3. run
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # custom-rag API
NEXT_PUBLIC_API_KEY=your-api-key           # from .env in custom-rag
```

## Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```
