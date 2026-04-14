FROM node:24-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

# Maintain same relative structure as local dev
COPY services/shared/ ./services/shared/
RUN cd services/shared && npm install --production

COPY services/user-service/package.json ./services/user-service/
RUN cd services/user-service && npm install --production

COPY services/user-service/src/ ./services/user-service/src/

WORKDIR /app/services/user-service
EXPOSE 3001
CMD ["node", "src/app.js"]
