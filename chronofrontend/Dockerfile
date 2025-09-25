FROM node:18-alpine

WORKDIR /usr/src/app

# Copy dependencies first
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Expose port 3000
EXPOSE 3000

# Run dev mode instead of build
CMD ["npm", "run", "dev"]
