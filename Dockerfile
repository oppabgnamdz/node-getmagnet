FROM node:18-alpine

WORKDIR /app

# Cài đặt Chromium và các thư viện phụ thuộc
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Thiết lập biến môi trường cho Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Sao chép package.json và package-lock.json trước để tận dụng cache
COPY package*.json ./
RUN npm ci --only=production

# Sao chép mã nguồn ứng dụng
COPY . .

# Thiết lập môi trường cho ứng dụng
ENV PORT=3000
ENV LOGIN=e5547481b0b75c2846ed
ENV PASS=p164V8Md7Whr6Jl

# Mở cổng để truy cập ứng dụng
EXPOSE $PORT

# Quyền truy cập cho các thư mục cần thiết
RUN mkdir -p /home/node/.cache/puppeteer && \
    chown -R node:node /home/node

# Chạy ứng dụng với user không phải root
USER node

CMD ["node", "index.js"]