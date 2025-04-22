// Tạo khai báo cho các modules không có type definition
declare module 'objects-to-csv';

// Sửa lỗi liên quan đến xử lý các kiểu lỗi không xác định
interface CustomError extends Error {
	message: string;
	code?: string;
	stack?: string;
}

// Khai báo kiểu cho các đối tượng DOM không có sẵn type
interface ElementWithHref extends Element {
	href: string;
}

// Fix cho AxiosError
interface CustomAxiosError extends Error {
	response?: any;
	request?: any;
	message: string;
}
