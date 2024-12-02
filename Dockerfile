FROM node:18-bullseye

WORKDIR /app

COPY package*.json ./
RUN npm i

COPY . .

ENV GOOGLE_APPLICATION_CREDENTIALS="/app/credentials.json"

EXPOSE 3000

CMD ["npm", "run", "start"]
