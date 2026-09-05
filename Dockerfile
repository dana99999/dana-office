FROM node:22-alpine
WORKDIR /app
ENV TZ=Asia/Seoul NODE_ENV=production
RUN apk add --no-cache python3 make g++ tzdata
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["npm", "run", "start"]
