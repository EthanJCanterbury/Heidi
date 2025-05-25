
FROM oven/bun:1.2.11-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ ./src/
COPY manifest.json tsconfig.json ./
COPY admins.json emojis.json ./

# Create directories for any missing files
RUN mkdir -p src/utils

# Expose port (though not needed for Slack bot)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["bun", "src/index.ts"]
