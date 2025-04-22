FROM node:18-slim

WORKDIR /app

# Cài đặt Chrome và các phụ thuộc
RUN apt-get update && apt-get install -y wget gnupg build-essential && \
    wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list && \
    apt-get update && \
    apt-get install -y google-chrome-stable && \
    apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Thiết lập biến môi trường cho Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies but skip the postinstall script that runs the build
RUN npm ci --ignore-scripts

# Copy source code after dependencies installed
COPY . .

# Build TypeScript code separately
RUN npx tsc

# Thiết lập môi trường cho ứng dụng
ENV PORT=3000
ENV LOGIN=e5547481b0b75c2846ed
ENV PASS=p164V8Md7Whr6Jl

# Mở cổng để truy cập ứng dụng
EXPOSE $PORT

# Tạo user không phải root
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && mkdir -p /home/pptruser/.cache/puppeteer \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Chạy ứng dụng với user không phải root
USER pptruser

# Chạy ứng dụng từ file JS đã được biên dịch
CMD ["node", "dist/index.js"]