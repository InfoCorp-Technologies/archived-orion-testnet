FROM node:8-alpine

WORKDIR /app

RUN apk add --update --no-cache \
    build-base \
    python \
    git

COPY services/sentinel-exchange/package*.json ./

RUN npm install

COPY services/sentinel-exchange ./

CMD ["npm", "start"]