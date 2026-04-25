FROM node:24-alpine
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8
WORKDIR /app

# Maintain same relative structure as local dev
COPY services/shared/ ./services/shared/
RUN cd services/shared && npm install --production

COPY services/study-service/package.json ./services/study-service/
RUN cd services/study-service && npm install --production

COPY services/study-service/src/ ./services/study-service/src/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads && chown -R appuser:appgroup /app

RUN apk add --no-cache su-exec

WORKDIR /app/services/study-service
EXPOSE 3002
CMD ["sh", "-c", "chown -R appuser:appgroup /app/uploads 2>/dev/null; exec su-exec appuser node src/app.js"]
