FROM node:24-alpine
WORKDIR /app

COPY services/shared/package.json ./services/shared/
COPY services/shared/src/ ./services/shared/src/
RUN cd services/shared && npm install --production

COPY services/study-service/package.json ./
RUN npm install --production

COPY services/study-service/src/ ./src/

EXPOSE 3002
CMD ["node", "src/app.js"]
