FROM node:24-alpine
WORKDIR /app

COPY services/shared/package.json ./services/shared/
COPY services/shared/src/ ./services/shared/src/
RUN cd services/shared && npm install --production

COPY services/api-gateway/package.json ./
RUN npm install --production

COPY services/api-gateway/src/ ./src/

EXPOSE 3000
CMD ["node", "src/app.js"]
