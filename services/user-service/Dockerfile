FROM node:24-alpine
WORKDIR /app

# Copy shared module first
COPY services/shared/package.json ./services/shared/
COPY services/shared/src/ ./services/shared/src/
RUN cd services/shared && npm install --production

# Copy user service
COPY services/user-service/package.json ./
RUN npm install --production

COPY services/user-service/src/ ./src/

EXPOSE 3001
CMD ["node", "src/app.js"]
