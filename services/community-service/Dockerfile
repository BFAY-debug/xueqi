FROM node:24-alpine
WORKDIR /app

# Maintain same relative structure as local dev
COPY services/shared/ ./services/shared/
RUN cd services/shared && npm install --production

COPY services/community-service/package.json ./services/community-service/
RUN cd services/community-service && npm install --production

COPY services/community-service/src/ ./services/community-service/src/

WORKDIR /app/services/community-service
EXPOSE 3003
CMD ["node", "src/app.js"]
