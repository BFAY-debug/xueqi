FROM node:24-alpine
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8
WORKDIR /app

# Shared module is needed for logger
COPY services/shared/ ./services/shared/
RUN cd services/shared && npm install --production

COPY services/api-gateway/package.json ./services/api-gateway/
RUN cd services/api-gateway && npm install --production

COPY services/api-gateway/src/ ./services/api-gateway/src/

WORKDIR /app/services/api-gateway
EXPOSE 3000
CMD ["node", "src/app.js"]
