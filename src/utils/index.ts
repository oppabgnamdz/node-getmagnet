import axios, { AxiosResponse } from 'axios';
import { Response } from 'express';
import { MongoClient } from 'mongodb';

// MongoDB connection string
export const MONGO_URI =
	'mongodb+srv://nhnobnd:Dunghoi1@cluster0.uha2oe3.mongodb.net/';
export const DB_NAME = 'magnet-db';
export const COLLECTION_NAME = 'magnets';

// Base URLs for web scraping
export const BASE_URL = 'https://www.141jav.com/date';
export const BASE_URL_P = 'https://www.141ppv.com/date';

// MongoDB client
let mongoClient: MongoClient | null = null;

// Connect to MongoDB
export async function connectToMongo(): Promise<MongoClient> {
	if (mongoClient) return mongoClient;

	try {
		mongoClient = new MongoClient(MONGO_URI);
		await mongoClient.connect();
		console.log('Connected to MongoDB');
		return mongoClient;
	} catch (error) {
		console.error('MongoDB connection error:', error);
		throw error;
	}
}

// Utility function to fetch pages
export const fetchPage = async (url: string): Promise<string | null> => {
	try {
		console.log(`Đang gọi API đến: ${url}`);
		const response: AxiosResponse = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			},
			timeout: 30000,
		});

		console.log(`Nhận phản hồi thành công từ: ${url}`);
		return response.data;
	} catch (error: any) {
		console.error(`Lỗi khi tải ${url}:`, error.message);

		// Thêm xử lý cho các loại lỗi
		if (error.response) {
			// Phản hồi từ server với mã lỗi (4xx, 5xx)
			console.error(
				`Mã lỗi: ${error.response.status}, Dữ liệu: ${JSON.stringify(error.response.data)}`
			);
		} else if (error.request) {
			// Đã gửi request nhưng không nhận được phản hồi
			console.error('Không nhận được phản hồi từ server');
		}

		return null;
	}
};

// Utility function to render file for download
export const renderFile = (res: Response, date: string, side: string) => {
	res.setHeader(
		'Content-Disposition',
		'attachment; filename=' + `${side}-${date}.csv`
	);
	res.setHeader('Content-Transfer-Encoding', 'binary');
	res.setHeader('Content-Type', 'application/octet-stream');
};
