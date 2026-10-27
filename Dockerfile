FROM node:24.22.1-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
