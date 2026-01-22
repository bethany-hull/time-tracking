FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Cloud Run sets PORT environment variable
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
