FROM node:22-alpine
# ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./

RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
EXPOSE 8080

CMD ["npm", "run", "start:prod"]
