FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache docker-cli

COPY package.json ./
RUN npm install

COPY . .

EXPOSE 3001

CMD ["npm", "start"]