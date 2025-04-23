import express from 'express';
import cheerio from 'cheerio';
import axios from 'axios';
import puppeteer from 'puppeteer';
import { VideoData, SurritInfo } from '../types';

const router = express.Router();

// MissAV route - moved from /missav/:name to /:name since we're already mounting under /missav
router.get('/:name', async (req, res) => {
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
			headless: "new",
			executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--disable-features=IsolateOrigins,site-per-process',
				'--disable-web-security',
				'--single-process', // Thêm tùy chọn này để khắc phục lỗi EAGAIN
				'--no-zygote',      // Thêm tùy chọn này để tránh các vấn đề về quyền truy cập
			],
			ignoreDefaultArgs: ['--disable-extensions'],
		});

		const page = await browser.newPage();

		// Mảng lưu các URLs m3u8 đã phát hiện
		let m3u8Urls: string[] = [];

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
			const surritInfo: SurritInfo = await page.evaluate(() => {
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
	} catch (error: any) {
		console.error('Lỗi Puppeteer:', error.message);

		if (browser) {
			try {
				await browser.close();
			} catch (e: any) {
				console.error('Lỗi khi đóng trình duyệt:', e);
			}
		}

		// Nếu Puppeteer gặp lỗi, thử dùng axios với name từ params
		try {
			const name = req.params.name; // Lấy name từ params
			console.log(`Chuyển sang sử dụng axios cho: ${name}`);
			return await getMissavWithAxios(req, res, name);
		} catch (axiosError: any) {
			console.error('Lỗi khi dùng axios:', axiosError.message);
			res.status(500).json({
				error: 'Failed to fetch page',
				message: error.message,
			});
		}
	}
});

// Phương án dự phòng sử dụng axios thay vì puppeteer
async function getMissavWithAxios(
	req: express.Request,
	res: express.Response,
	nameParam: string
) {
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
			let possibleUuids: string[] = [];

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

// Get identifier route
router.get('/getcode/:id', async (req, res) => {
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

export default router;
