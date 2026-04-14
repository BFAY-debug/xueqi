FROM node:24-alpine
WORKDIR /app

# Maintain same relative structure as local dev
COPY services/shared/ ./services/shared/
RUN cd services/shared && npm install --production

COPY services/study-service/package.json ./services/study-service/
RUN cd services/study-service && npm install --production

COPY services/study-service/src/ ./services/study-service/src/

WORKDIR /app/services/study-service
EXPOSE 3002
CMD ["node", "src/app.js"]
