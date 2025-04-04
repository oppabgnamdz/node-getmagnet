console.log('hola');
const express = require('express');
const moment = require('moment');
const rp = require('request-promise');
const jsdom = require('jsdom');

const requestUrl = require('request');
const request = require('supertest');
var cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const http = require('http');
const ObjectsToCsv = require('objects-to-csv');
const { JSDOM } = jsdom;
const got = require('got');
var path = require('path');
const app = express();
const { throttle } = require('lodash');
const cheerio = require('cheerio');
const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');
app.use(cors());

// MongoDB connection string
const MONGO_URI =
	'mongodb+srv://nhnobnd:Dunghoi1@cluster0.uha2oe3.mongodb.net/';
const DB_NAME = 'magnet-db';
const COLLECTION_NAME = 'magnets';

// MongoDB client
let mongoClient = null;

// Connect to MongoDB
async function connectToMongo() {
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

const BASE_URL = 'https://www.141jav.com/date';
const BASE_URL_P = 'https://www.141ppv.com/date';

// Gỡ bỏ throttle để kiểm soát tốc độ thủ công thông qua delay
const fetchPage = async (url) => {
	try {
		console.log(`Đang gọi API đến: ${url}`);
		const response = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			},
			timeout: 30000,
		});

		console.log(`Nhận phản hồi thành công từ: ${url}`);
		return response.data;
	} catch (error) {
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

//test
app.get('/', async (req, res) => {
	try {
		return res.status(200).json('work');
	} catch (e) {
		return res.status(200).json();
	}
});

app.get('/getcode/:id', async (req, res) => {
	try {
		const code = req.params.id;
		const url = `https://missav123.com/vi/${code}`;

		// Fetch the webpage
		const response = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			},
		});

		// Parse the HTML content
		const $ = cheerio.load(response.data);

		// Look for JavaScript content
		const scripts = $('script')
			.map((i, el) => $(el).html())
			.get();

		// Find the script containing the identifier pattern
		let identifier = '';
		for (const script of scripts) {
			if (script && script.includes('5f9154ff')) {
				const matches = script.match(
					/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
				);
				if (matches && matches[0]) {
					identifier = matches[0];
					break;
				}
			}
		}

		if (identifier) {
			res.json({ identifier });
		} else {
			res.status(404).json({ error: 'Identifier not found' });
		}
	} catch (error) {
		console.error('Error:', error);
		res.status(500).json({ error: 'Failed to fetch or parse the webpage' });
	}
});

app.get('/missav/:name', async (req, res) => {
	let browser = null;
	try {
		const name = req.params.name;
		const url = `https://missav123.com/vi/${name}`;
		console.log(`Đang truy cập: ${url} bằng Puppeteer...`);

		// Khởi chạy trình duyệt headless
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-software-rasterizer',
				'--disable-features=IsolateOrigins,site-per-process',
				'--disable-web-security',
			],
		});

		const page = await browser.newPage();

		// Cấu hình trình duyệt giống người dùng thật
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
		);
		await page.setViewport({ width: 1920, height: 1080 });

		// Thiết lập các headers
		await page.setExtraHTTPHeaders({
			'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
		});

		// Mở trang web và đợi nó tải xong
		await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

		// Thay thế waitForTimeout bằng delay tương đương
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Lấy nội dung trang
		const pageContent = await page.content();

		// Thực thi JavaScript trong trang để tìm m3u8 và mẫu của surrit
		const findM3u8 = await page.evaluate(() => {
			// Tìm trong tất cả script tags
			const scripts = Array.from(document.querySelectorAll('script'));
			let m3u8Urls = [];

			// Tìm URL m3u8 trong các scripts
			for (const script of scripts) {
				const text = script.textContent || '';
				const matches = text.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
				if (matches) m3u8Urls = [...m3u8Urls, ...matches];
			}

			// Tìm UUID
			const uuidMatches = document.body.innerHTML.match(
				/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
			);

			// Tìm mẫu chuỗi đặc biệt
			const patternStr = document.body.innerHTML.match(
				/m3u8\|[0-9a-f]+\|[0-9a-f]+\|[0-9a-f]+\|[0-9a-f]+\|[0-9a-f]+\|com\|surrit\|https/g
			);

			return {
				m3u8Urls,
				uuidMatches: uuidMatches || [],
				patternStr: patternStr || [],
			};
		});

		// Đóng trình duyệt khi xong
		await browser.close();
		browser = null;

		// Thử xây dựng URL từ mẫu chuỗi đặc biệt
		if (findM3u8.patternStr.length > 0) {
			console.log(`Tìm thấy mẫu chuỗi đặc biệt: ${findM3u8.patternStr[0]}`);

			// Phân tích chuỗi: m3u8|1bc761c36b2e|97c9|4016|e63a|ecc60b41|com|surrit|https
			const parts = findM3u8.patternStr[0].split('|');

			if (parts.length >= 9) {
				// Trích xuất các phần tương ứng
				const uuid5 = parts[5]; // ecc60b41
				const uuid4 = parts[4]; // e63a
				const uuid3 = parts[3]; // 4016
				const uuid2 = parts[2]; // 97c9
				const uuid1 = parts[1]; // 1bc761c36b2e

				// Tạo UUID theo định dạng chuẩn
				const fullUuid = `${uuid5}-${uuid4}-${uuid3}-${uuid2}-${uuid1}`;
				const m3u8Url = `https://surrit.com/${fullUuid}/720p/video.m3u8`;

				console.log(`Đã tạo được URL m3u8: ${m3u8Url}`);
				return res.json({ m3u8Url: m3u8Url });
			}
		}

		// Nếu không tìm thấy mẫu chuỗi đặc biệt, thử các phương pháp khác
		if (findM3u8.m3u8Urls.length > 0) {
			console.log(`Tìm thấy ${findM3u8.m3u8Urls.length} URLs m3u8`);
			return res.json({ m3u8Url: findM3u8.m3u8Urls[0] });
		}

		if (findM3u8.uuidMatches.length > 0) {
			console.log(`Tìm thấy ${findM3u8.uuidMatches.length} UUIDs`);

			// Tạo các URL m3u8 có thể có từ UUIDs
			const possibleUrls = findM3u8.uuidMatches
				.slice(0, 3)
				.map((uuid) => `https://surrit.com/${uuid}/720p/video.m3u8`);

			return res.json({
				m3u8Url: possibleUrls[0],
				uuids: findM3u8.uuidMatches.slice(0, 5),
				possibleUrls,
			});
		}

		// Nếu không tìm thấy
		return res.status(404).json({
			error: 'M3U8 URL not found',
			message: 'Không thể tìm thấy URL m3u8 trong nội dung trang',
		});
	} catch (error) {
		console.error('Lỗi:', error.message);

		if (browser) {
			try {
				await browser.close();
			} catch (e) {
				console.error('Lỗi khi đóng trình duyệt:', e);
			}
		}

		res.status(500).json({
			error: 'Failed to fetch page with Puppeteer',
			message: error.message,
		});
	}
});

app.get('/torrent', async (req, res) => {
	try {
		const date =
			req.query.date || moment().subtract(1, 'd').format('YYYY/MM/DD');

		console.log('???', date);
		const page = req.query.page === 'undefined' ? null : req.query.page;
		let start = 0;
		let end = 200;
		let host = `https://jav-torrent.org/date/${moment(date).format(
			'YYYY-MM-DD'
		)}?page=`;
		const url = (index) => {
			return `${host}${index}`;
		};
		if (page) {
			start = parseInt(page) - 1;
			end = parseInt(page);
		}
		try {
			let data = [];
			for (let j = parseInt(start); j < parseInt(end); j++) {
				const html = await rp(url(j + 1));
				console.log('aasdasd', url(j + 1));
				const dom = new JSDOM(`${html}`);
				var arr = [],
					l = dom.window.document.links;

				for (var i = 0; i < l.length; i++) {
					arr.push(l[i].href);
				}
				const breakPage = arr.find((item) => item.includes('/download/'));
				if (!breakPage) {
					break;
				}
				console.log({ breakPage });
				const needArr = arr.filter((item) => item.includes('/download/'));
				const haveDomain = needArr.map((item) => item);
				data = [...data, ...haveDomain];
			}
			const mapping = data.map((item, index) => {
				return item;
			});
			if (page) {
				return res.send(mapping);
			}
			console.log({ mapping });
			return res.status(200).json(mapping);
		} catch (e) {
			console.log({ e });
			return res.status(200).json([]);
		}
		return res.status(200).json([]);
	} catch (e) {
		return res.status(200).json([]);
	}
});

app.get('/ppv', async (req, res) => {
	try {
		const date =
			req.query.date || moment().subtract(1, 'd').format('YYYY/MM/DD');
		const page = req.query.page === 'undefined' ? null : req.query.page;

		let start = page ? parseInt(page) - 1 : 0;
		let end = page ? parseInt(page) : 200;
		const base = 'https://www.141ppv.com';
		const host = `${base}/date/${moment(date).format('YYYY/MM/DD')}?page=`;

		let result = [];

		for (let j = start; j < end; j++) {
			const html = await got(`${host}${j + 1}`, {
				headers: {
					'User-Agent':
						'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				},
				retry: {
					limit: 3,
					statusCodes: [403, 408, 413, 429, 500, 502, 503, 504],
				},
				timeout: {
					request: 30000,
				},
			});

			const dom = new JSDOM(html.body);
			const links = Array.from(dom.window.document.links)
				.map((link) => link.href)
				.filter((href) => href.includes('/download/'));
			console.log({ links });

			if (!links.length) break;

			const fullUrls = links.map((link) => base + link);
			if (page) {
				return res.status(200).json(fullUrls);
			}
			result.push(...fullUrls);
		}

		return res.status(200).json(result);
	} catch (e) {
		console.error(e);
		return res.status(200).json([]);
	}
});
app.get('/jav', async (req, res) => {
	// const vgmUrl = 'https://onejav.com/date/2022/08/06?page=1';
	// const test = await got(vgmUrl);
	// console.log({ test });
	try {
		const date = req.query.date;
		let start = 0;
		let end = 200;
		let base = 'https://onejav.com';
		let host = `https://onejav.com/${moment(date).format('YYYY/MM/DD')}?page=`;
		const url = (index) => {
			return `${host}${index}`;
		};
		try {
			let data = [];
			for (let j = parseInt(start); j < parseInt(end); j++) {
				const html = await got(url(j + 1), {
					headers: {
						'User-Agent':
							'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
					},
					// Uncomment the following lines if you want to use a proxy
					// agent: {
					//   https: new HttpsProxyAgent('http://your-proxy-url:port')
					// },
					retry: {
						limit: 3,
						statusCodes: [403, 408, 413, 429, 500, 502, 503, 504],
					},
					timeout: {
						request: 30000,
					},
				});

				const dom = new JSDOM(`${html.body}`);
				var arr = [],
					l = dom.window.document.links;

				for (var i = 0; i < l.length; i++) {
					arr.push(l[i].href);
				}
				const breakPage = arr.find((item) => item.includes('/download/'));
				console.log({ breakPage });
				if (!breakPage) {
					break;
				}

				const needArr = arr.filter((item) => item.includes('/download/'));
				const haveDomain = needArr.map((item) => item);
				data = [...data, ...haveDomain];
			}
			const mapping = data.map((item, index) => {
				return { url: base + item };
			});

			const csv = new ObjectsToCsv(mapping);
			await csv.toDisk(`./jav-${date}.csv`);
			renderFile(res, date, 'jav');
			return res.sendFile(path.join(__dirname, `./jav-${date}.csv`));
		} catch (e) {
			console.log({ e });
			res.status(200).json({ data: 'error' });
		}
		return res.status(200).json({ data: [] });
	} catch (e) {
		return res.status(200).json({ data: [] });
	}
});

app.get(`/crypto-json`, async (req, res) => {
	return res.status(200).json({
		tokens: [
			{
				id: 'sudeng',
				threshold: 0.005,
				type: 'above',
				name: 'Sudeng',
			},
			{
				id: 'suins-token',
				threshold: 0.15,
				type: 'above',
				name: 'Suins Token',
			},
			{
				id: 'suilend',
				threshold: 0.6,
				type: 'above',
				name: 'Suilend',
			},
			{
				id: 'bitcoin',
				threshold: 84500,
				type: 'above',
				name: 'Bitcoin',
			},

			{
				id: 'ethereum',
				threshold: 2100,
				type: 'above',
				name: 'Ethereum',
			},
		],
	});
});

app.get('/special', async (req, res) => {
	try {
		const minusDate = parseInt(req.query.date.split(',')[0]);
		if (isNaN(minusDate)) {
			return res.status(200).json([]);
		}

		const side = req.query.date.split(',')[1];
		const page = req.query.date.split(',')[2];
		const date = moment().subtract(minusDate, 'd').format('YYYY/MM/DD');
		const formattedDate = moment(date).format('YYYY/MM/DD');

		const crawlPages = async (baseUrl, start, end) => {
			const linkMap = new Map();
			const baseWithoutDate = baseUrl.replace('/date', '');

			if (page) {
				const pageUrl = `${baseUrl}/${formattedDate}?page=${page}`;
				const html = await fetchPage(pageUrl);

				if (html) {
					const $ = cheerio.load(html);
					const links = $('a[href*="/download/"]')
						.map((_, el) => $(el).attr('href'))
						.get();

					links.forEach((link) => {
						const code = link.split('/').pop().split('.')[0];
						linkMap.set(code, link);
					});
				}
			} else {
				for (let j = start; j < end; j++) {
					const pageUrl = `${baseUrl}/${formattedDate}?page=${j + 1}`;
					const html = await fetchPage(pageUrl);

					if (!html) continue;

					const $ = cheerio.load(html);
					const links = $('a[href*="/download/"]')
						.map((_, el) => $(el).attr('href'))
						.get();

					if (links.length === 0) break;

					links.forEach((link) => {
						const code = link.split('/').pop().split('.')[0];
						linkMap.set(code, link);
					});

					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}

			const uniqueLinks = Array.from(linkMap.values());
			return uniqueLinks.map((link) => `${baseWithoutDate}${link}`);
		};

		const baseUrl = side === 'j' ? BASE_URL : BASE_URL_P;
		const start = 0;
		const end = 200;

		const torrents = await crawlPages(baseUrl, start, end);
		return res.status(200).json(torrents);
	} catch (e) {
		console.error('Error in /special endpoint:', e);
		return res.status(200).json([]);
	}
});

// Function to crawl pages from both URLs
const crawlPages = async (baseUrl, date) => {
	try {
		const linkMap = new Map();
		const baseWithoutDate = baseUrl.replace('/date', '');
		const formattedDate = moment(date).format('YYYY/MM/DD');

		// Điều chỉnh thời gian chờ nhanh hơn
		for (let j = 0; j < 5; j++) {
			const pageUrl = `${baseUrl}/${formattedDate}?page=${j + 1}`;
			console.log(
				`Đang tải trang ${j + 1} từ ${baseUrl} cho ngày ${formattedDate}`
			);

			// Thêm thời gian chờ trước khi tải trang - giảm xuống 1 giây
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const html = await fetchPage(pageUrl);

			if (!html) {
				console.log(`Không thể tải trang ${pageUrl}`);
				continue;
			}

			const $ = cheerio.load(html);
			const links = $('a[href*="/download/"]')
				.map((_, el) => $(el).attr('href'))
				.get();

			console.log(`Tìm thấy ${links.length} links từ trang ${j + 1}`);

			if (links.length === 0) {
				console.log(
					`Không tìm thấy links, dừng tìm kiếm cho ${baseUrl} ngày ${formattedDate}`
				);
				break;
			}

			links.forEach((link) => {
				const code = link.split('/').pop().split('.')[0];
				linkMap.set(code, link);
			});

			// Tăng thời gian chờ giữa các trang - giảm xuống 3 giây
			console.log(`Chờ 3 giây trước khi tải trang tiếp theo...`);
			await new Promise((resolve) => setTimeout(resolve, 3000));
		}

		const uniqueLinks = Array.from(linkMap.values());
		console.log(
			`Tổng cộng ${uniqueLinks.length} links duy nhất từ ${baseUrl} cho ngày ${date}`
		);

		return uniqueLinks.map((link) => {
			const code = link.split('/').pop().split('.')[0];
			return {
				url: `${baseWithoutDate}${link}`,
				code: code,
				source: baseUrl === BASE_URL ? 'jav' : 'ppv',
				date: date,
			};
		});
	} catch (error) {
		console.error(`Lỗi khi crawl ${baseUrl} cho ngày ${date}:`, error);
		return [];
	}
};

// Get magnets from both sites for the last 3 days
app.get('/get-all', async (req, res) => {
	try {
		// Connect to MongoDB
		const client = await connectToMongo();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);

		// Get dates for today, yesterday, and the day before
		const dates = [
			moment().format('YYYY-MM-DD'),
			moment().subtract(1, 'days').format('YYYY-MM-DD'),
			moment().subtract(2, 'days').format('YYYY-MM-DD'),
		];

		console.log('Bắt đầu crawl dữ liệu cho các ngày:', dates);

		let allMagnets = [];
		let newMagnets = [];

		// Crawl tuần tự và xử lý từng ngày
		for (const date of dates) {
			console.log(`\n==== Đang xử lý ngày: ${date} ====`);

			// Xử lý tuần tự từng trang để tránh quá tải
			console.log(`\n-- Crawl từ ${BASE_URL} cho ngày ${date} --`);
			const javMagnets = await crawlPages(BASE_URL, date);

			// Giảm thời gian chờ xuống còn 3 giây
			console.log(`\nChờ 3 giây trước khi crawl trang tiếp theo...`);
			await new Promise((resolve) => setTimeout(resolve, 3000));

			console.log(`\n-- Crawl từ ${BASE_URL_P} cho ngày ${date} --`);
			const ppvMagnets = await crawlPages(BASE_URL_P, date);

			console.log(
				`\nĐã tìm thấy ${javMagnets.length} links từ JAV và ${ppvMagnets.length} links từ PPV cho ngày ${date}`
			);

			// Kết hợp kết quả
			const combinedMagnets = [...javMagnets, ...ppvMagnets];
			allMagnets = [...allMagnets, ...combinedMagnets];

			// Giảm thời gian chờ giữa các ngày xuống còn 3 giây
			if (date !== dates[dates.length - 1]) {
				console.log(`\nChờ 3 giây trước khi xử lý ngày tiếp theo...`);
				await new Promise((resolve) => setTimeout(resolve, 3000));
			}
		}

		console.log(
			`\n==== Tổng cộng đã thu thập được ${allMagnets.length} links ====`
		);
		console.log(`\nBắt đầu kiểm tra và thêm vào MongoDB...`);

		// Check for existing magnets and insert new ones
		let processedCount = 0;
		for (const magnet of allMagnets) {
			processedCount++;
			if (processedCount % 20 === 0) {
				console.log(`Đã xử lý ${processedCount}/${allMagnets.length} links`);
			}

			const exists = await collection.findOne({
				code: magnet.code,
				source: magnet.source,
			});

			if (!exists) {
				await collection.insertOne({
					...magnet,
					created_at: new Date(),
				});
				newMagnets.push(magnet);
			}
		}

		console.log(
			`\n==== Hoàn thành! Đã thêm ${newMagnets.length} links mới vào MongoDB ====`
		);

		// Chỉ trả về mảng các URL từ newMagnets
		const urls = newMagnets.map((magnet) => magnet.url);
		return res.status(200).json(urls);
	} catch (error) {
		console.error('Error in /get-all endpoint:', error);
		return res.status(500).json({ error: error.message });
	}
});

app.get('*', function (req, res) {
	return res.status(200).json([]);
});

const renderFile = (res, date, side) => {
	res.setHeader(
		'Content-Disposition',
		'attachment; filename=' + `${side}-${date}.csv`
	);
	res.setHeader('Content-Transfer-Encoding', 'binary');
	res.setHeader('Content-Type', 'application/octet-stream');
};

// Initialize MongoDB connection when starting the server
connectToMongo()
	.then(() => {
		app.listen(process.env.PORT || 3000, () =>
			console.log(`Example app listening on port ${process.env.PORT || 3000}!`)
		);
	})
	.catch((err) => {
		console.error('Failed to connect to MongoDB on startup', err);
		process.exit(1);
	});

// Close MongoDB connection when app is terminating
process.on('SIGINT', async () => {
	if (mongoClient) {
		await mongoClient.close();
		console.log('MongoDB connection closed');
	}
	process.exit(0);
});

process.on('uncaughtException', (err) => {
	console.log({ err });
	process.exit();
});
