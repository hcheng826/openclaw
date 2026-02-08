FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build

# Copy static files to standalone directory
RUN cp -r .next/static .next/standalone/.next/

EXPOSE 3000

CMD ["node", ".next/standalone/server.js"]