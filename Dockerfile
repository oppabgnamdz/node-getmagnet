# Sử dụng một phiên bản nhỏ hơn của Node.js
FROM node:14-alpine AS build

# Sao chép các tệp tin của ứng dụng vào container
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production

# Thiết lập môi trường cho ứng dụng
ENV PORT=4321
ENV LOGIN=e5547481b0b75c2846ed
ENV PASS=p164V8Md7Whr6Jl

# Sao chép các tệp tin còn lại và chạy ứng dụng
FROM build AS final
WORKDIR /app
COPY . .
EXPOSE $PORT
CMD ["node", "index.js"]
