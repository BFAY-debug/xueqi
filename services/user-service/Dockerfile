FROM node:24-alpine
ENV LANG=C.UTF-8 LC_ALL=C.UTF-8
WORKDIR /app

# Maintain same relative structure as local dev
COPY services/shared/ ./services/shared/
RUN cd services/shared && npm install --production

COPY services/user-service/package.json ./services/user-service/
RUN cd services/user-service && npm install --production

COPY services/user-service/src/ ./services/user-service/src/

RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads && chown -R appuser:appgroup /app

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories \
    && apk add --no-cache su-exec

WORKDIR /app/services/user-service
EXPOSE 3001
CMD ["sh", "-c", "chown -R appuser:appgroup /app/uploads 2>/dev/null; exec su-exec appuser node src/app.js"]
