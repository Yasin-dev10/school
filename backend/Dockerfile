FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_management?schema=public
ENV DIRECT_URL=postgresql://postgres:postgres@localhost:5432/school_management?schema=public

COPY package*.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["npm", "start"]
