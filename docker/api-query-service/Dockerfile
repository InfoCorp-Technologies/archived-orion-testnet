FROM node:8-alpine

WORKDIR /app

COPY services/mock-api-query/package*.json ./

RUN npm install

COPY services/mock-api-query ./

CMD ["npm", "start"]