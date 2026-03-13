# Production Stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Expose API port
EXPOSE 3001

# Start the server
CMD ["node", "server.js"]
