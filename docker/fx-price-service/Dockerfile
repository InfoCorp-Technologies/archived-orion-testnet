FROM node:8-alpine

WORKDIR /app

COPY services/mock-fx-price/package*.json ./

RUN npm install

COPY services/mock-fx-price ./

CMD ["npm", "start"]