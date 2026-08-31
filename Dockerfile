# Dockerfile for deploying Next.js + FFmpeg (libass) + yt-dlp on Render / Docker
FROM node:20-bullseye-slim

# 1. Install system dependencies: FFmpeg with libass support, python3, python3-pip, and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libass-dev \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 2. Download and install yt-dlp via both pip and direct executable
RUN pip3 install --no-cache-dir yt-dlp \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp \
    && ln -sf /usr/local/bin/yt-dlp /usr/bin/yt-dlp

WORKDIR /app

# 3. Install NPM dependencies
COPY package*.json ./
RUN npm install

# 4. Copy source code and build Next.js application
COPY . .
RUN npm run build

# 5. Create output and temp directories
RUN mkdir -p public/temp public/outputs

# 6. Expose port and start Next.js production server
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
