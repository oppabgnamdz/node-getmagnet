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
		let name = req.params.name;

		// Kiểm tra và định dạng lại mã code JAV
		if (!name.includes('-')) {
			// Tìm vị trí chuyển từ chữ cái sang số
			const regex = /([a-zA-Z]+)(\d+)/;
			const match = name.match(regex);
			if (match) {
				name = `${match[1]}-${match[2]}`;
				console.log(
					`Đã chuyển đổi mã code từ ${req.params.name} thành ${name}`
				);
			}
		}

		const url = `https://missav123.com/vi/${name}`;
		console.log(`Đang truy cập: ${url} bằng Puppeteer...`);

		// Cố gắng chạy trực tiếp mà không cần chỉ định executablePath
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-features=IsolateOrigins,site-per-process',
				'--disable-web-security',
			],
		});

		const page = await browser.newPage();

		// Mảng lưu các URLs m3u8 đã phát hiện
		let m3u8Urls = [];

		// Lắng nghe tất cả các network requests
		await page.setRequestInterception(true);

		page.on('request', (request) => {
			const url = request.url();
			if (url.includes('.m3u8')) {
				console.log(`Phát hiện m3u8 URL trong request: ${url}`);
				if (!m3u8Urls.includes(url)) {
					m3u8Urls.push(url);
				}
			}
			request.continue();
		});

		page.on('response', async (response) => {
			const url = response.url();
			if (url.includes('.m3u8')) {
				console.log(`Phát hiện m3u8 URL trong response: ${url}`);
				if (!m3u8Urls.includes(url)) {
					m3u8Urls.push(url);
				}
			}
		});

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

		// Đợi thêm thời gian để đảm bảo các video player có thể tải
		await new Promise((resolve) => setTimeout(resolve, 8000));

		// Nếu chưa tìm thấy m3u8, thử tìm trong tất cả các frames
		if (m3u8Urls.length === 0) {
			// Tìm trong tất cả các frames
			const frames = page.frames();
			for (const frame of frames) {
				try {
					const frameContent = await frame.content();
					const matches = frameContent.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
					if (matches) {
						for (const match of matches) {
							if (!m3u8Urls.includes(match)) {
								console.log(`Phát hiện m3u8 URL trong frame: ${match}`);
								m3u8Urls.push(match);
							}
						}
					}
				} catch (e) {
					console.log(`Lỗi khi xử lý frame: ${e.message}`);
				}
			}
		}

		// Nếu vẫn chưa tìm thấy, tìm trong nội dung trang
		if (m3u8Urls.length === 0) {
			const pageContent = await page.content();
			const matches = pageContent.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
			if (matches) {
				for (const match of matches) {
					if (!m3u8Urls.includes(match)) {
						console.log(`Phát hiện m3u8 URL trong HTML: ${match}`);
						m3u8Urls.push(match);
					}
				}
			}

			// Thực thi để tìm thông qua API surrit.com nếu cần
			const surritInfo = await page.evaluate(() => {
				// Tìm UUID
				const uuidMatches = document.body.innerHTML.match(
					/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
				);

				// Tìm mẫu chuỗi video format
				const videoFormatPattern = document.body.innerHTML.match(
					/https\|video\|(1280x720|720p)/g
				);

				return {
					uuidMatches: uuidMatches || [],
					videoFormat: videoFormatPattern
						? videoFormatPattern[0].split('|')[2]
						: '720p',
				};
			});

			// Nếu tìm thấy UUID, thử tạo URL surrit
			if (surritInfo.uuidMatches.length > 0) {
				const uuid = surritInfo.uuidMatches[0];
				const videoFormat = surritInfo.videoFormat;
				const surritUrl = `https://surrit.com/${uuid}/${videoFormat}/video.m3u8`;

				console.log(`Tạo m3u8 URL từ UUID: ${surritUrl}`);
				m3u8Urls.push(surritUrl);
			}
		}

		// Đóng trình duyệt khi xong
		await browser.close();
		browser = null;

		// Trả về kết quả
		if (m3u8Urls.length > 0) {
			// Ưu tiên URL surrit.com
			const surritUrl = m3u8Urls.find((url) => url.includes('surrit.com'));
			if (surritUrl) {
				return res.json({ m3u8Url: surritUrl });
			}

			// Nếu không có URL surrit, trả về URL đầu tiên
			return res.json({ m3u8Url: m3u8Urls[0], allUrls: m3u8Urls });
		}

		// Nếu không tìm thấy, thử dùng axios
		console.log('Không tìm thấy URL m3u8 với Puppeteer, chuyển sang axios');
		return await getMissavWithAxios(req, res, name);
	} catch (error) {
		console.error('Lỗi Puppeteer:', error.message);

		if (browser) {
			try {
				await browser.close();
			} catch (e) {
				console.error('Lỗi khi đóng trình duyệt:', e);
			}
		}

		// Nếu Puppeteer gặp lỗi, thử dùng axios với name từ params
		try {
			const name = req.params.name; // Lấy name từ params
			console.log(`Chuyển sang sử dụng axios cho: ${name}`);
			return await getMissavWithAxios(req, res, name);
		} catch (axiosError) {
			console.error('Lỗi khi dùng axios:', axiosError.message);
			res.status(500).json({
				error: 'Failed to fetch page',
				message: error.message,
			});
		}
	}
});

// Phương án dự phòng sử dụng axios thay vì puppeteer
async function getMissavWithAxios(req, res, nameParam) {
	try {
		let name = nameParam || req.params.name; // Sử dụng tham số hoặc lấy từ req.params

		// Kiểm tra và định dạng lại mã code JAV
		if (!name.includes('-')) {
			// Tìm vị trí chuyển từ chữ cái sang số
			const regex = /([a-zA-Z]+)(\d+)/;
			const match = name.match(regex);
			if (match) {
				name = `${match[1]}-${match[2]}`;
				console.log(
					`Đã chuyển đổi mã code từ ${nameParam || req.params.name} thành ${name}`
				);
			}
		}

		const url = `https://missav123.com/vi/${name}`;
		console.log(`Đang truy cập: ${url} bằng axios...`);

		// Fetch the webpage
		const response = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
				'Accept-Encoding': 'gzip, deflate, br',
				'Cache-Control': 'max-age=0',
				Referer: 'https://missav123.com/',
				'sec-ch-ua':
					'"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Windows"',
				'sec-fetch-dest': 'document',
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'none',
				'sec-fetch-user': '?1',
				'Upgrade-Insecure-Requests': '1',
			},
			timeout: 60000,
		});

		// Tìm URL m3u8 trực tiếp trong nội dung HTML
		const pageContent = response.data;
		const m3u8Matches = pageContent.match(/(https?:\/\/[^"'\s]+\.m3u8)/g) || [];

		// Parse the HTML content để tìm sâu hơn trong script
		const $ = cheerio.load(pageContent);

		// Tìm URL m3u8 trong script
		let m3u8Urls = [...m3u8Matches]; // Bắt đầu với các URL đã tìm thấy
		const scripts = $('script')
			.map((i, el) => $(el).html())
			.get();

		for (const script of scripts) {
			if (!script) continue;

			if (script.includes('.m3u8')) {
				const matches = script.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
				if (matches && matches.length > 0) {
					for (const match of matches) {
						if (!m3u8Urls.includes(match)) {
							console.log(`Tìm thấy URL m3u8 trong script: ${match}`);
							m3u8Urls.push(match);
						}
					}
				}
			}
		}

		// Nếu tìm được m3u8 URL, trả về ngay
		if (m3u8Urls.length > 0) {
			// Ưu tiên URL từ surrit.com
			const surritUrl = m3u8Urls.find((url) => url.includes('surrit.com'));
			if (surritUrl) {
				console.log(`Trả về URL m3u8 từ surrit.com: ${surritUrl}`);
				return res.json({ m3u8Url: surritUrl });
			}

			console.log(`Trả về URL m3u8 đầu tiên: ${m3u8Urls[0]}`);
			return res.json({ m3u8Url: m3u8Urls[0], allUrls: m3u8Urls });
		}

		// Nếu không tìm thấy mẫu, thử tìm UUID trực tiếp
		const uuidMatches =
			pageContent.match(
				/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
			) || [];

		// Tìm định dạng video
		const videoFormatMatch = pageContent.match(/https\|video\|(1280x720|720p)/);
		const videoFormat = videoFormatMatch ? videoFormatMatch[1] : '720p';

		if (uuidMatches && uuidMatches.length > 0) {
			// Lọc UUID nghi ngờ là của surrit.com (thường xuất hiện trong script liên quan đến video)
			let possibleUuids = [];

			// Lấy các UUID xuất hiện gần chuỗi 'surrit', 'video', 'm3u8'
			for (const uuid of uuidMatches) {
				const idx = pageContent.indexOf(uuid);
				const context = pageContent.substring(
					Math.max(0, idx - 100),
					Math.min(pageContent.length, idx + 100)
				);

				if (
					context.includes('surrit') ||
					context.includes('video') ||
					context.includes('m3u8') ||
					context.includes('hls')
				) {
					possibleUuids.push(uuid);
				}
			}

			// Nếu không tìm thấy UUID trong ngữ cảnh, sử dụng UUID đầu tiên
			if (possibleUuids.length === 0) {
				possibleUuids = [uuidMatches[0]];
			}

			// Tạo các URL có thể
			const possibleUrls = possibleUuids.map(
				(uuid) => `https://surrit.com/${uuid}/${videoFormat}/video.m3u8`
			);

			console.log(`Tạo các URL m3u8 có thể: ${possibleUrls.join(', ')}`);
			return res.json({
				m3u8Url: possibleUrls[0],
				allUrls: possibleUrls,
			});
		}

		// Không tìm thấy thông tin để tạo URL
		return res.status(404).json({
			error: 'M3U8 URL not found',
			message: 'Không thể tìm thấy URL m3u8 trong nội dung trang',
		});
	} catch (error) {
		console.error('Lỗi axios:', error.message);
		throw error;
	}
}

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
	let browser = null;
	try {
		const minusDate = parseInt(req.query.date.split(',')[0]);
		if (isNaN(minusDate)) {
			return res.status(200).json([]);
		}

		const side = req.query.date.split(',')[1];
		const page = req.query.date.split(',')[2];
		const date = moment().subtract(minusDate, 'd').format('YYYY/MM/DD');
		const formattedDate = moment(date).format('YYYY/MM/DD');
		const baseUrl = side === 'j' ? BASE_URL : BASE_URL_P;
		const baseWithoutDate = baseUrl.replace('/date', '');

		console.log(`Đang khởi tạo Puppeteer cho trang ${baseUrl}...`);
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-features=IsolateOrigins,site-per-process',
				'--disable-web-security',
			],
		});

		const linkMap = new Map();

		if (page) {
			// Nếu chỉ định page, chỉ crawl trang đó
			const pageUrl = `${baseUrl}/${formattedDate}?page=${page}`;
			console.log(
				`Đang tải trang ${page} từ ${baseUrl} cho ngày ${formattedDate}`
			);

			const puppeteerPage = await browser.newPage();

			// Cấu hình trình duyệt giống người dùng thật
			await puppeteerPage.setUserAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			);
			await puppeteerPage.setViewport({ width: 1920, height: 1080 });

			// Thiết lập các headers
			await puppeteerPage.setExtraHTTPHeaders({
				'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
			});

			try {
				// Mở trang web và đợi nó tải xong
				await puppeteerPage.goto(pageUrl, {
					waitUntil: 'networkidle2',
					timeout: 60000,
				});

				// Thực thi JavaScript trong trang để tìm các link tải xuống
				const links = await puppeteerPage.evaluate(() => {
					return Array.from(
						document.querySelectorAll('a[href*="/download/"]')
					).map((link) => link.getAttribute('href'));
				});

				console.log(`Tìm thấy ${links.length} links từ trang ${page}`);

				links.forEach((link) => {
					const code = link.split('/').pop().split('.')[0];
					linkMap.set(code, link);
				});

				await puppeteerPage.close();
			} catch (pageError) {
				console.error(`Lỗi khi tải trang ${pageUrl}:`, pageError.message);
				await puppeteerPage.close();
			}
		} else {
			// Nếu không chỉ định page, crawl từ trang 1 đến khi không còn links
			let pageNumber = 1;
			let shouldContinue = true;
			const start = 0;
			const end = 200;

			for (let j = start; j < end && shouldContinue; j++) {
				const pageUrl = `${baseUrl}/${formattedDate}?page=${j + 1}`;
				console.log(
					`Đang tải trang ${j + 1} từ ${baseUrl} cho ngày ${formattedDate}`
				);

				const puppeteerPage = await browser.newPage();

				// Cấu hình trình duyệt giống người dùng thật
				await puppeteerPage.setUserAgent(
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
				);
				await puppeteerPage.setViewport({ width: 1920, height: 1080 });

				// Thiết lập các headers
				await puppeteerPage.setExtraHTTPHeaders({
					'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
				});

				try {
					// Mở trang web và đợi nó tải xong
					await puppeteerPage.goto(pageUrl, {
						waitUntil: 'networkidle2',
						timeout: 60000,
					});

					// Thực thi JavaScript trong trang để tìm các link tải xuống
					const links = await puppeteerPage.evaluate(() => {
						return Array.from(
							document.querySelectorAll('a[href*="/download/"]')
						).map((link) => link.getAttribute('href'));
					});

					console.log(`Tìm thấy ${links.length} links từ trang ${j + 1}`);

					// Nếu không còn links nào, dừng vòng lặp
					if (links.length === 0) {
						console.log(
							`Không tìm thấy links, dừng tìm kiếm cho ${baseUrl} ngày ${formattedDate}`
						);
						await puppeteerPage.close();
						shouldContinue = false;
						break;
					}

					links.forEach((link) => {
						const code = link.split('/').pop().split('.')[0];
						linkMap.set(code, link);
					});

					await puppeteerPage.close();

					// Giảm thời gian chờ giữa các trang từ 3s xuống 1.5s
					console.log(`Chờ 1.5 giây trước khi tải trang tiếp theo...`);
					await new Promise((resolve) => setTimeout(resolve, 1500));
				} catch (pageError) {
					console.error(`Lỗi khi tải trang ${pageUrl}:`, pageError.message);
					await puppeteerPage.close();
					shouldContinue = false;
				}
			}
		}

		// Đóng trình duyệt sau khi hoàn thành
		if (browser) {
			console.log(`Đóng trình duyệt Puppeteer cho ${baseUrl}`);
			await browser.close();
			browser = null;
		}

		const uniqueLinks = Array.from(linkMap.values());
		console.log(
			`Tổng cộng ${uniqueLinks.length} links duy nhất từ ${baseUrl} cho ngày ${date}`
		);

		const torrents = uniqueLinks.map((link) => `${baseWithoutDate}${link}`);
		return res.status(200).json(torrents);
	} catch (e) {
		console.error('Lỗi trong endpoint /special:', e);

		// Đảm bảo đóng trình duyệt nếu có lỗi
		if (browser) {
			try {
				await browser.close();
			} catch (closeError) {
				console.error('Lỗi khi đóng trình duyệt:', closeError);
			}
		}

		return res.status(200).json([]);
	}
});

// Function to crawl pages from both URLs using Puppeteer
const crawlPages = async (baseUrl, date) => {
	try {
		const baseWithoutDate = baseUrl.replace('/date', '');
		const formattedDate = moment(date).format('YYYY/MM/DD');

		let browser = null;
		let linkMap = new Map();

		try {
			console.log(
				`Đang khởi tạo Puppeteer cho ${baseUrl} ngày ${formattedDate}...`
			);

			browser = await puppeteer.launch({
				headless: true,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-dev-shm-usage',
					'--disable-gpu',
					'--disable-features=IsolateOrigins,site-per-process',
					'--disable-web-security',
				],
			});

			// Sử dụng vòng lặp vô hạn và dừng khi không tìm thấy link nào
			let pageNumber = 1;
			let shouldContinue = true;

			while (shouldContinue) {
				const pageUrl = `${baseUrl}/${formattedDate}?page=${pageNumber}`;
				console.log(
					`Đang tải trang ${pageNumber} từ ${baseUrl} cho ngày ${formattedDate}`
				);

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

				try {
					// Mở trang web và đợi nó tải xong
					await page.goto(pageUrl, {
						waitUntil: 'networkidle2',
						timeout: 60000,
					});

					// Thực thi JavaScript trong trang để tìm các link tải xuống
					const links = await page.evaluate(() => {
						return Array.from(
							document.querySelectorAll('a[href*="/download/"]')
						).map((link) => link.getAttribute('href'));
					});

					console.log(`Tìm thấy ${links.length} links từ trang ${pageNumber}`);

					// Nếu không còn links nào, dừng vòng lặp
					if (links.length === 0) {
						console.log(
							`Không tìm thấy links, dừng tìm kiếm cho ${baseUrl} ngày ${formattedDate}`
						);
						await page.close();
						shouldContinue = false;
						break;
					}

					links.forEach((link) => {
						const code = link.split('/').pop().split('.')[0];
						linkMap.set(code, link);
					});

					await page.close();
					pageNumber++;

					// Giảm thời gian chờ giữa các trang từ 3s xuống 1.5s
					console.log(`Chờ 1.5 giây trước khi tải trang tiếp theo...`);
					await new Promise((resolve) => setTimeout(resolve, 1500));
				} catch (pageError) {
					console.error(`Lỗi khi tải trang ${pageUrl}:`, pageError.message);
					await page.close();
					shouldContinue = false;
				}
			}
		} finally {
			if (browser) {
				console.log(`Đóng trình duyệt Puppeteer cho ${baseUrl}`);
				await browser.close();
			}
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
	let browser = null;
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

			// Giảm thời gian chờ xuống còn 1.5 giây
			console.log(`\nChờ 1.5 giây trước khi crawl trang tiếp theo...`);
			await new Promise((resolve) => setTimeout(resolve, 1500));

			console.log(`\n-- Crawl từ ${BASE_URL_P} cho ngày ${date} --`);
			const ppvMagnets = await crawlPages(BASE_URL_P, date);

			console.log(
				`\nĐã tìm thấy ${javMagnets.length} links từ JAV và ${ppvMagnets.length} links từ PPV cho ngày ${date}`
			);

			// Kết hợp kết quả
			const combinedMagnets = [...javMagnets, ...ppvMagnets];
			allMagnets = [...allMagnets, ...combinedMagnets];

			// Giảm thời gian chờ giữa các ngày xuống còn 1.5 giây
			if (date !== dates[dates.length - 1]) {
				console.log(`\nChờ 1.5 giây trước khi xử lý ngày tiếp theo...`);
				await new Promise((resolve) => setTimeout(resolve, 1500));
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

app.get('/get-western', async (req, res) => {
	let browser = null;
	try {
		// Kết nối MongoDB
		const client = await connectToMongo();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);

		console.log('Bắt đầu crawl dữ liệu từ javdb.com/western');

		// Khởi tạo puppeteer để crawl
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-features=IsolateOrigins,site-per-process',
				'--disable-web-security',
			],
		});

		// Tạo trang mới
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

		// Truy cập trang javdb.com/western
		console.log('Đang truy cập trang javdb.com/western');
		await page.goto('https://javdb.com/western', {
			waitUntil: 'networkidle2',
			timeout: 60000,
		});

		// Lấy 10 href đầu tiên có chứa /v/
		const hrefs = await page.evaluate(() => {
			const links = Array.from(document.querySelectorAll('a[href*="/v/"]'));
			return links.slice(0, 10).map((a) => a.href);
		});

		console.log(`Đã tìm thấy ${hrefs.length} links có chứa /v/`);

		// Mảng chứa các magnet links mới
		let newMagnets = [];

		// Xử lý từng href
		for (const href of hrefs) {
			// Kiểm tra trong DB xem đã có href này chưa
			const exists = await collection.findOne({ url: href });

			if (exists) {
				console.log(`Link ${href} đã tồn tại trong DB, bỏ qua.`);
				continue;
			}

			console.log(`Đang xử lý link ${href}...`);

			// Tạo trang mới để truy cập vào href
			const itemPage = await browser.newPage();
			await itemPage.setUserAgent(
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
			);
			await itemPage.setViewport({ width: 1920, height: 1080 });

			// Truy cập vào trang chi tiết
			await itemPage.goto(href, {
				waitUntil: 'networkidle2',
				timeout: 60000,
			});

			// Tìm magnet link đầu tiên
			const magnetLink = await itemPage.evaluate(() => {
				// Tìm tất cả các elements có chứa magnet link
				const magnets = Array.from(
					document.querySelectorAll('a[href^="magnet:"]')
				);
				if (magnets.length > 0) {
					return magnets[0].href;
				}
				return null;
			});

			await itemPage.close();

			if (magnetLink) {
				console.log(`Đã tìm thấy magnet link cho ${href}`);

				// Lấy code từ URL
				const code = href.split('/').pop();

				// Thêm vào DB
				await collection.insertOne({
					url: href,
					code: code,
					magnet: magnetLink,
					source: 'javdb-western',
					created_at: new Date(),
				});

				newMagnets.push(magnetLink);
			} else {
				console.log(`Không tìm thấy magnet link cho ${href}`);
			}

			// Delay để tránh bị chặn
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}

		if (browser) {
			await browser.close();
		}

		console.log(`Đã thêm ${newMagnets.length} magnet links mới vào DB`);
		return res.status(200).json(newMagnets);
	} catch (error) {
		console.error('Error in /get-western endpoint:', error);
		if (browser) {
			await browser.close();
		}
		return res.status(500).json({ error: error.message });
	}
});

app.get('/sukebei', async (req, res) => {
	try {
		// Connect to MongoDB
		const client = await connectToMongo();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);

		console.log('Bắt đầu crawl dữ liệu từ sukebei.nyaa.si');

		// Trang cần crawl
		const pages = [1, 2, 3];
		const baseUrl = 'https://sukebei.nyaa.si/?f=0&c=2_2&q=&s=id&o=desc&p=';

		let allMagnets = [];
		let newMagnets = [];

		// Crawl từng trang
		for (const page of pages) {
			console.log(`\n==== Đang xử lý trang: ${page} ====`);
			const url = `${baseUrl}${page}`;
			console.log(`Đang tải trang: ${url}`);

			try {
				const html = await fetchPage(url);

				if (!html) {
					console.error(`Không thể tải trang ${url}`);
					continue;
				}

				// Tải JSDOM để phân tích HTML
				const dom = new JSDOM(html);
				const document = dom.window.document;

				// Tìm tất cả các thẻ a có href chứa magnet:?xt
				const magnetLinks = Array.from(
					document.querySelectorAll('a[href^="magnet:?xt"]')
				).map((a) => a.href);

				if (magnetLinks && magnetLinks.length > 0) {
					console.log(
						`Đã tìm thấy ${magnetLinks.length} magnet links từ trang ${page}`
					);

					// Lọc và format các magnet links
					const formattedMagnets = magnetLinks.map((link) => {
						// Thay thế &amp; bằng &
						return link.replace(/&amp;/g, '&');
					});

					allMagnets = [...allMagnets, ...formattedMagnets];
				} else {
					// Nếu không tìm thấy qua DOM, thử dùng regex
					const magnetRegex =
						/magnet:\?xt=urn:btih:[a-zA-Z0-9]{40}(&amp;|&)[^"']*/g;
					const matches = html.match(magnetRegex);

					if (matches && matches.length > 0) {
						console.log(
							`Đã tìm thấy ${matches.length} magnet links từ trang ${page} bằng regex`
						);

						// Lọc và format các magnet links
						const formattedMagnets = matches.map((link) => {
							// Thay thế &amp; bằng &
							return link.replace(/&amp;/g, '&');
						});

						allMagnets = [...allMagnets, ...formattedMagnets];
					} else {
						console.log(`Không tìm thấy magnet links nào từ trang ${page}`);
					}
				}
			} catch (pageError) {
				console.error(`Lỗi khi xử lý trang ${url}:`, pageError.message);
			}

			// Delay để tránh bị block
			if (page !== pages[pages.length - 1]) {
				console.log(`Chờ 1.5 giây trước khi tải trang tiếp theo...`);
				await new Promise((resolve) => setTimeout(resolve, 1500));
			}
		}

		console.log(
			`\n==== Tổng cộng đã thu thập được ${allMagnets.length} magnet links ====`
		);

		if (allMagnets.length === 0) {
			return res.status(200).json({
				message: 'Không tìm thấy magnet links nào',
				magnets: [],
			});
		}

		console.log(`\nBắt đầu kiểm tra và thêm vào MongoDB...`);

		// Check for existing magnets and insert new ones
		let processedCount = 0;
		for (const magnetUrl of allMagnets) {
			processedCount++;
			if (processedCount % 20 === 0) {
				console.log(`Đã xử lý ${processedCount}/${allMagnets.length} links`);
			}

			// Extract hash from magnet URL to use as unique identifier
			const hashMatch = magnetUrl.match(
				/magnet:\?xt=urn:btih:([a-zA-Z0-9]{32,40})/i
			);
			if (!hashMatch || !hashMatch[1]) {
				console.log(
					`Bỏ qua magnet link không hợp lệ: ${magnetUrl.substring(0, 50)}...`
				);
				continue;
			}

			const hash = hashMatch[1].toLowerCase();

			try {
				// Kiểm tra xem hash đã tồn tại chưa
				const exists = await collection.findOne({
					hash: hash,
					source: 'sukebei',
				});

				if (!exists) {
					// Tạo mã duy nhất cho bản ghi
					const uniqueCode = `sukebei-${hash.substring(0, 8)}`;

					await collection.insertOne({
						url: magnetUrl,
						hash: hash,
						code: uniqueCode, // Không để code là null
						source: 'sukebei',
						created_at: new Date(),
					});
					newMagnets.push(magnetUrl);
				}
			} catch (dbError) {
				console.error(`Lỗi khi thêm vào MongoDB: ${dbError.message}`);
			}
		}

		console.log(
			`\n==== Hoàn thành! Đã thêm ${newMagnets.length} magnet links mới vào MongoDB ====`
		);

		// Return array of magnet URLs
		return res.status(200).json(newMagnets);
	} catch (error) {
		console.error('Error in /sukebei endpoint:', error);
		return res.status(500).json({
			error: error.message,
			stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
		});
	}
});

app.get('/onejav', async (req, res) => {
	try {
		// Connect to MongoDB
		const client = await connectToMongo();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);

		console.log('Bắt đầu crawl dữ liệu từ onejav.com');

		// Trang cần crawl (từ 1 đến 10)
		const pages = Array.from({ length: 10 }, (_, i) => i + 1);
		const baseUrl = 'https://onejav.com/new?page=';

		let allLinks = [];
		let newLinks = [];

		// Crawl từng trang
		for (const page of pages) {
			console.log(`\n==== Đang xử lý trang: ${page} ====`);
			const url = `${baseUrl}${page}`;
			console.log(`Đang tải trang: ${url}`);

			try {
				const html = await fetchPage(url);

				if (!html) {
					console.error(`Không thể tải trang ${url}`);
					continue;
				}

				// Tải JSDOM để phân tích HTML
				const dom = new JSDOM(html);
				const document = dom.window.document;

				// Tìm tất cả các thẻ a có href chứa /download/
				const downloadLinks = Array.from(
					document.querySelectorAll('a[href*="/download/"]')
				).map((a) => 'https://onejav.com' + a.href);

				if (downloadLinks && downloadLinks.length > 0) {
					console.log(
						`Đã tìm thấy ${downloadLinks.length} download links từ trang ${page}`
					);
					allLinks = [...allLinks, ...downloadLinks];
				} else {
					console.log(`Không tìm thấy download links nào từ trang ${page}`);
				}
			} catch (pageError) {
				console.error(`Lỗi khi xử lý trang ${url}:`, pageError.message);
			}

			// Delay để tránh bị block
			if (page !== pages[pages.length - 1]) {
				console.log(`Chờ 1.5 giây trước khi tải trang tiếp theo...`);
				await new Promise((resolve) => setTimeout(resolve, 1500));
			}
		}

		console.log(
			`\n==== Tổng cộng đã thu thập được ${allLinks.length} download links ====`
		);

		if (allLinks.length === 0) {
			return res.status(200).json({
				message: 'Không tìm thấy download links nào',
				links: [],
			});
		}

		console.log(`\nBắt đầu kiểm tra và thêm vào MongoDB...`);

		// Check for existing links and insert new ones
		let processedCount = 0;
		for (const link of allLinks) {
			processedCount++;
			if (processedCount % 20 === 0) {
				console.log(`Đã xử lý ${processedCount}/${allLinks.length} links`);
			}

			// Extract code from URL to use as unique identifier
			const codeMatch = link.match(/\/download\/([^\/]+)/);
			if (!codeMatch || !codeMatch[1]) {
				console.log(`Bỏ qua link không hợp lệ: ${link.substring(0, 50)}...`);
				continue;
			}

			const code = codeMatch[1];

			try {
				// Kiểm tra xem code đã tồn tại chưa
				const exists = await collection.findOne({
					code: code,
					source: 'onejav',
				});

				if (!exists) {
					await collection.insertOne({
						url: link,
						code: code,
						source: 'onejav',
						created_at: new Date(),
					});
					newLinks.push(link);
				}
			} catch (dbError) {
				console.error(`Lỗi khi thêm vào MongoDB: ${dbError.message}`);
			}
		}

		console.log(
			`\n==== Hoàn thành! Đã thêm ${newLinks.length} download links mới vào MongoDB ====`
		);

		// Return array of download URLs
		return res.status(200).json(newLinks);
	} catch (error) {
		console.error('Error in /onejav endpoint:', error);
		return res.status(500).json({
			error: error.message,
			stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
		});
	}
});

app.get('/24av/:name', async (req, res) => {
	let browser = null;
	try {
		let name = req.params.name;

		// Kiểm tra và định dạng lại mã code JAV nếu cần
		if (!name.includes('-')) {
			// Tìm vị trí chuyển từ chữ cái sang số
			const regex = /([a-zA-Z]+)(\d+)/;
			const match = name.match(regex);
			if (match) {
				name = `${match[1]}-${match[2]}`;
				console.log(
					`Đã chuyển đổi mã code từ ${req.params.name} thành ${name}`
				);
			}
		}

		// Tạo URL tìm kiếm
		const searchUrl = `https://24av.net/vi/search?keyword=${encodeURIComponent(name)}`;
		console.log(`Đang truy cập trang tìm kiếm: ${searchUrl}`);

		// Khởi tạo trình duyệt
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-features=IsolateOrigins,site-per-process',
				'--disable-web-security',
			],
		});

		const searchPage = await browser.newPage();

		// Cấu hình trình duyệt giống người dùng thật
		await searchPage.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
		);
		await searchPage.setViewport({ width: 1920, height: 1080 });

		// Thiết lập các headers
		await searchPage.setExtraHTTPHeaders({
			'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
		});

		// Mở trang tìm kiếm và đợi nó tải xong
		await searchPage.goto(searchUrl, {
			waitUntil: 'networkidle2',
			timeout: 60000,
		});

		// Đợi thêm thời gian để đảm bảo trang tải xong
		await new Promise((resolve) => setTimeout(resolve, 5000));

		// Lấy URL đúng từ kết quả tìm kiếm
		const videoData = await searchPage.evaluate(() => {
			// Tìm thẻ a đầu tiên có class="name"
			const nameLink = document.querySelector('a.name');
			if (nameLink) {
				// Lấy href của link đầu tiên
				const href = nameLink.getAttribute('href');
				// Lấy base URL
				const baseUrl = window.location.origin;

				// Đảm bảo URL đầy đủ
				let fullUrl = '';
				if (href.startsWith('http')) {
					fullUrl = href;
				} else if (href.startsWith('/vi/')) {
					fullUrl = baseUrl + href;
				} else if (href.startsWith('/')) {
					fullUrl = baseUrl + '/vi' + href;
				} else {
					fullUrl = baseUrl + '/vi/' + href;
				}

				return {
					href: href,
					fullUrl: fullUrl,
				};
			}
			return null;
		});

		let videoUrl = '';

		// Kiểm tra nếu tìm thấy kết quả
		if (videoData && videoData.fullUrl) {
			console.log(
				`Đã tìm thấy URL video từ trang tìm kiếm: ${videoData.fullUrl}`
			);
			videoUrl = videoData.fullUrl;
		} else {
			// Nếu không tìm thấy, sử dụng URL mặc định
			videoUrl = `https://24av.net/vi/v/${name}`;
			console.log(
				`Không tìm thấy kết quả tìm kiếm, sử dụng URL mặc định: ${videoUrl}`
			);
		}

		// Đóng trang tìm kiếm
		await searchPage.close();

		// Mở trang video
		console.log(`Đang truy cập URL video: ${videoUrl}`);
		const page = await browser.newPage();

		// Mảng lưu các URLs m3u8 đã phát hiện
		let m3u8Urls = [];

		// Lắng nghe tất cả các network requests
		await page.setRequestInterception(true);

		page.on('request', (request) => {
			const url = request.url();
			if (url.includes('.m3u8')) {
				console.log(`Phát hiện m3u8 URL trong request: ${url}`);
				if (!m3u8Urls.includes(url)) {
					m3u8Urls.push(url);
				}
			}
			request.continue();
		});

		page.on('response', async (response) => {
			const url = response.url();
			if (url.includes('.m3u8')) {
				console.log(`Phát hiện m3u8 URL trong response: ${url}`);
				if (!m3u8Urls.includes(url)) {
					m3u8Urls.push(url);
				}
			}
		});

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
		await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });

		// Đợi thêm thời gian để đảm bảo các video player có thể tải
		await new Promise((resolve) => setTimeout(resolve, 8000));

		// Nếu chưa tìm thấy m3u8, thử tìm trong tất cả các frames
		if (m3u8Urls.length === 0) {
			// Tìm trong tất cả các frames
			const frames = page.frames();
			for (const frame of frames) {
				try {
					const frameContent = await frame.content();
					const matches = frameContent.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
					if (matches) {
						for (const match of matches) {
							if (!m3u8Urls.includes(match)) {
								console.log(`Phát hiện m3u8 URL trong frame: ${match}`);
								m3u8Urls.push(match);
							}
						}
					}
				} catch (e) {
					console.log(`Lỗi khi xử lý frame: ${e.message}`);
				}
			}
		}

		// Nếu vẫn chưa tìm thấy, tìm trong nội dung trang
		if (m3u8Urls.length === 0) {
			const pageContent = await page.content();
			const matches = pageContent.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
			if (matches) {
				for (const match of matches) {
					if (!m3u8Urls.includes(match)) {
						console.log(`Phát hiện m3u8 URL trong HTML: ${match}`);
						m3u8Urls.push(match);
					}
				}
			}

			// Thực thi để tìm thông qua các script hoặc API khác nếu cần
			const videoInfo = await page.evaluate(() => {
				// Tìm các m3u8 URLs trong các phần tử video
				const videoElements = document.querySelectorAll('video source');
				const m3u8UrlsFromVideo = Array.from(videoElements)
					.filter((src) => src.src && src.src.includes('.m3u8'))
					.map((src) => src.src);

				// Tìm tất cả các script trên trang
				const scripts = document.querySelectorAll('script');
				const scriptContents = Array.from(scripts).map((s) => s.innerHTML);

				// Tìm tất cả UUID có thể liên quan đến video
				const uuidMatches =
					document.body.innerHTML.match(
						/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
					) || [];

				return {
					m3u8UrlsFromVideo,
					scriptContents,
					uuidMatches,
				};
			});

			// Thêm m3u8 URLs từ các phần tử video
			if (
				videoInfo.m3u8UrlsFromVideo &&
				videoInfo.m3u8UrlsFromVideo.length > 0
			) {
				for (const url of videoInfo.m3u8UrlsFromVideo) {
					if (!m3u8Urls.includes(url)) {
						console.log(`Phát hiện m3u8 URL từ phần tử video: ${url}`);
						m3u8Urls.push(url);
					}
				}
			}

			// Tìm m3u8 URLs trong nội dung script
			if (videoInfo.scriptContents && videoInfo.scriptContents.length > 0) {
				for (const script of videoInfo.scriptContents) {
					if (!script) continue;

					const scriptMatches = script.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
					if (scriptMatches) {
						for (const match of scriptMatches) {
							if (!m3u8Urls.includes(match)) {
								console.log(`Phát hiện m3u8 URL từ script: ${match}`);
								m3u8Urls.push(match);
							}
						}
					}
				}
			}
		}

		// Đóng trình duyệt khi xong
		await browser.close();
		browser = null;

		// Trả về kết quả nếu tìm thấy
		if (m3u8Urls.length > 0) {
			return res.json({ m3u8Url: m3u8Urls[0], allUrls: m3u8Urls });
		}

		// Nếu không tìm thấy qua Puppeteer, thử dùng axios với URL video đã tìm được
		console.log('Không tìm thấy URL m3u8 với Puppeteer, chuyển sang axios');

		// Trích xuất name từ URL video (vì URL có thể khác với name ban đầu)
		let videoName = name;
		if (videoData && videoData.href) {
			// Pattern mở rộng để hỗ trợ nhiều định dạng URL khác nhau như dm1/v/mifd-570 hoặc vi/v/mifd-570
			const pathMatch = videoData.href.match(/\/v\/([^\/]+)$/);
			if (pathMatch && pathMatch[1]) {
				videoName = pathMatch[1];
				console.log(`Đã trích xuất mã code mới từ URL: ${videoName}`);
			}
		}

		return await get24avWithAxios(req, res, videoName);
	} catch (error) {
		console.error('Lỗi Puppeteer:', error.message);

		if (browser) {
			try {
				await browser.close();
			} catch (e) {
				console.error('Lỗi khi đóng trình duyệt:', e);
			}
		}

		// Nếu Puppeteer gặp lỗi, thử dùng axios với name từ params
		try {
			const name = req.params.name; // Lấy name từ params
			console.log(`Chuyển sang sử dụng axios cho: ${name}`);
			return await get24avWithAxios(req, res, name);
		} catch (axiosError) {
			console.error('Lỗi khi dùng axios:', axiosError.message);
			res.status(500).json({
				error: 'Failed to fetch page',
				message: error.message,
			});
		}
	}
});

// Phương án dự phòng sử dụng axios thay vì puppeteer cho 24av
async function get24avWithAxios(req, res, nameParam) {
	try {
		let name = nameParam || req.params.name; // Sử dụng tham số hoặc lấy từ req.params

		// Kiểm tra và định dạng lại mã code JAV nếu cần
		if (!name.includes('-')) {
			// Tìm vị trí chuyển từ chữ cái sang số
			const regex = /([a-zA-Z]+)(\d+)/;
			const match = name.match(regex);
			if (match) {
				name = `${match[1]}-${match[2]}`;
				console.log(
					`Đã chuyển đổi mã code từ ${nameParam || req.params.name} thành ${name}`
				);
			}
		}

		// Đầu tiên thử tìm kiếm để lấy URL chính xác
		const searchUrl = `https://24av.net/vi/search?keyword=${encodeURIComponent(name)}`;
		console.log(`Đang tìm kiếm URL chính xác qua: ${searchUrl}`);

		// Lấy nội dung trang tìm kiếm
		const searchResponse = await axios.get(searchUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
				'Accept-Encoding': 'gzip, deflate, br',
				'Cache-Control': 'max-age=0',
				Referer: 'https://24av.net/',
			},
			timeout: 60000,
		});

		// Parse nội dung HTML để tìm URL video đầu tiên
		const $ = cheerio.load(searchResponse.data);
		let videoUrl = '';
		let foundUrl = false;

		// Tìm thẻ a đầu tiên có class="name"
		const nameLink = $('a.name').first();
		if (nameLink.length > 0) {
			const href = nameLink.attr('href');
			if (href) {
				// Kiểm tra nếu href đã có http thì sử dụng trực tiếp
				if (href.startsWith('http')) {
					videoUrl = href;
				} else {
					// Đảm bảo URL đầy đủ có /vi/ nếu cần
					if (href.startsWith('/vi/')) {
						videoUrl = `https://24av.net${href}`;
					} else if (href.startsWith('/')) {
						videoUrl = `https://24av.net/vi${href}`;
					} else {
						videoUrl = `https://24av.net/vi/${href}`;
					}
				}
				foundUrl = true;
				console.log(`Đã tìm thấy URL video từ trang tìm kiếm: ${videoUrl}`);
			}
		}

		// Nếu không tìm thấy URL từ tìm kiếm, sử dụng URL mặc định
		if (!foundUrl) {
			videoUrl = `https://24av.net/vi/v/${name}`;
			console.log(
				`Không tìm thấy kết quả tìm kiếm, sử dụng URL mặc định: ${videoUrl}`
			);
		}

		// Lấy nội dung trang video
		console.log(`Đang truy cập URL video: ${videoUrl}`);
		const response = await axios.get(videoUrl, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
				'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
				'Accept-Encoding': 'gzip, deflate, br',
				'Cache-Control': 'max-age=0',
				Referer: 'https://24av.net/',
				'sec-ch-ua':
					'"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Windows"',
				'sec-fetch-dest': 'document',
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'none',
				'sec-fetch-user': '?1',
				'Upgrade-Insecure-Requests': '1',
			},
			timeout: 60000,
		});

		// Tìm URL m3u8 trực tiếp trong nội dung HTML
		const pageContent = response.data;
		const m3u8Matches = pageContent.match(/(https?:\/\/[^"'\s]+\.m3u8)/g) || [];

		// Parse nội dung HTML để tìm sâu hơn
		const $video = cheerio.load(pageContent);

		// Tìm URL m3u8 trong script và các phần tử video
		let m3u8Urls = [...m3u8Matches]; // Bắt đầu với các URL đã tìm thấy

		// Tìm trong các phần tử video
		$video('video source').each((i, el) => {
			const src = $video(el).attr('src');
			if (src && src.includes('.m3u8') && !m3u8Urls.includes(src)) {
				console.log(`Tìm thấy URL m3u8 trong phần tử video: ${src}`);
				m3u8Urls.push(src);
			}
		});

		// Tìm trong các script
		const scripts = $video('script')
			.map((i, el) => $video(el).html())
			.get();

		for (const script of scripts) {
			if (!script) continue;

			if (script.includes('.m3u8')) {
				const matches = script.match(/(https?:\/\/[^"'\s]+\.m3u8)/g);
				if (matches && matches.length > 0) {
					for (const match of matches) {
						if (!m3u8Urls.includes(match)) {
							console.log(`Tìm thấy URL m3u8 trong script: ${match}`);
							m3u8Urls.push(match);
						}
					}
				}
			}
		}

		// Nếu tìm được m3u8 URL, trả về ngay
		if (m3u8Urls.length > 0) {
			console.log(`Trả về URL m3u8 đầu tiên: ${m3u8Urls[0]}`);
			return res.json({ m3u8Url: m3u8Urls[0], allUrls: m3u8Urls });
		}

		// Không tìm thấy thông tin để tạo URL
		return res.status(404).json({
			error: 'M3U8 URL not found',
			message: 'Không thể tìm thấy URL m3u8 trong nội dung trang',
		});
	} catch (error) {
		console.error('Lỗi axios:', error.message);
		throw error;
	}
}

// Route để lấy dữ liệu mới từ 24av
app.get('/release-24av', async (req, res) => {
	try {
		console.log('Bắt đầu lấy dữ liệu từ 10 trang 24av...');

		// Kết nối đến MongoDB
		const client = await connectToMongo();
		const db = client.db(DB_NAME);
		const collection = db.collection('24av_items');

		// Mảng chứa tất cả items từ 10 trang
		let allItems = [];

		// Lấy dữ liệu từ 10 trang
		for (let page = 1; page <= 10; page++) {
			try {
				console.log(`Đang lấy dữ liệu từ trang ${page}...`);
				const url = `https://24av.net/vi/dm5/recent-update?page=${page}&json=1`;

				const response = await axios.get(url, {
					headers: {
						'User-Agent':
							'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
						Accept: 'application/json',
						'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
					},
					timeout: 30000,
				});

				if (
					response.data &&
					response.data.status === 200 &&
					response.data.result &&
					response.data.result.items
				) {
					// Thêm items vào mảng allItems
					allItems = allItems.concat(response.data.result.items);
					console.log(
						`Đã lấy ${response.data.result.items.length} items từ trang ${page}`
					);
				} else {
					console.log(`Không có dữ liệu hợp lệ từ trang ${page}`);
				}

				// Đợi một chút giữa các request để tránh bị block
				await new Promise((resolve) => setTimeout(resolve, 1000));
			} catch (error) {
				console.error(`Lỗi khi lấy dữ liệu từ trang ${page}:`, error.message);
			}
		}

		console.log(`Tổng cộng đã lấy được ${allItems.length} items từ 10 trang`);

		// Mảng chứa các items mới
		let newItems = [];

		// Kiểm tra từng item xem đã có trong database chưa
		for (const item of allItems) {
			// Thêm trường created_at
			item.created_at = new Date();

			// Kiểm tra item đã tồn tại chưa bằng id
			const existingItem = await collection.findOne({ id: item.id });

			if (!existingItem) {
				// Item chưa tồn tại, thêm vào mảng newItems
				newItems.push(item);
			}
		}

		// Nếu có items mới thì thêm vào database
		if (newItems.length > 0) {
			await collection.insertMany(newItems);
			console.log(`Đã thêm ${newItems.length} items mới vào database`);
		} else {
			console.log('Không có items mới để thêm vào database');
		}

		// Trả về mảng code của các items mới
		const newItemCodes = newItems.map((item) => item.code);

		// Trả về kết quả
		return res.status(200).json(newItemCodes);
	} catch (error) {
		console.error('Lỗi khi xử lý request:', error);
		return res.status(500).json([]);
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
