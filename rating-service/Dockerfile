FROM node:22-alpine

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

EXPOSE 5003

CMD ["sh", "-c", "npm run migrate && npm start"]