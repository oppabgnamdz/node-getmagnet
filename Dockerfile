FROM node:14

# Sao chép các tệp tin của ứng dụng vào container
WORKDIR /app
COPY . /app

# Cài đặt các phụ thuộc cần thiết
RUN npm install

# Thiết lập môi trường cho ứng dụng
ENV PORT=4000
ENV LOGIN=a073d4ce84538cdc139b
ENV PASS=OAAmqmXJ7oSgrW

# Mở cổng để truy cập ứng dụng
EXPOSE $PORT

# Chạy ứng dụng
CMD ["node", "index.js"]
