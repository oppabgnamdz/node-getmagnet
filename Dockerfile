FROM node:18-slim

WORKDIR /app

# Cài đặt các phụ thuộc
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
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

# Sao chép package.json và cài đặt dependencies
COPY package*.json ./
RUN npm ci

# Sao chép mã nguồn ứng dụng
COPY . .

# Thiết lập môi trường cho ứng dụng
ENV PORT=3000
ENV LOGIN=e5547481b0b75c2846ed
ENV PASS=p164V8Md7Whr6Jl

# Mở cổng để truy cập ứng dụng
EXPOSE $PORT

# Tạo user không phải root
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Chạy ứng dụng với user không phải root
USER pptruser

CMD ["node", "index.js"]