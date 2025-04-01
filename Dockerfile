FROM node:18-alpine

WORKDIR /app

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

# Chạy ứng dụng với user không phải root
USER node

CMD ["node", "index.js"]