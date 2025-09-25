FROM node:18-alpine

WORKDIR /usr/src/app

# Copy dependencies first (better caching)
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "run", "dev"]
