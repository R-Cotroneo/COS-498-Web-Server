FROM node:lts

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Remove any existing package-lock.json to force fresh install
RUN rm -f package-lock.json

# Install dependencies fresh for the current Node version
RUN npm install

# Copy source code
COPY . .

# Expose port (internal to container network)
EXPOSE 4610

# Start the application
CMD ["node", "server.js"]
