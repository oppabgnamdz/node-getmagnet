FROM node:14

# Sao chép các tệp tin của ứng dụng vào container
WORKDIR /app
COPY . /app

# Cài đặt các phụ thuộc cần thiết
RUN npm install

# Thiết lập môi trường cho ứng dụng
ENV PORT=3000

# Mở cổng để truy cập ứng dụng
EXPOSE $PORT

# Chạy ứng dụng
CMD ["node", "index.js"]
