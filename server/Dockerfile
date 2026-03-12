FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ ./src/
RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "src/index.js"]
