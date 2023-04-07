FROM node:14

# Sao chép các tệp tin của ứng dụng vào container
WORKDIR /app
COPY . /app

# Cài đặt các phụ thuộc cần thiết
RUN npm install

# Thiết lập môi trường cho ứng dụng
ENV PORT=4321
ENV LOGIN=e5547481b0b75c2846ed
ENV PASS=p164V8Md7Whr6Jl

# Mở cổng để truy cập ứng dụng
EXPOSE $PORT

# Chạy ứng dụng
CMD ["node", "index.js"]
