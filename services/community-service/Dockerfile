FROM node:24-alpine
WORKDIR /app

COPY services/shared/package.json ./services/shared/
COPY services/shared/src/ ./services/shared/src/
RUN cd services/shared && npm install --production

COPY services/community-service/package.json ./
RUN npm install --production

COPY services/community-service/src/ ./src/

EXPOSE 3003
CMD ["node", "src/app.js"]
