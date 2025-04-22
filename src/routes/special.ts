import express from 'express';
import moment from 'moment';
import puppeteer from 'puppeteer';
import { BASE_URL, BASE_URL_P } from '../utils';
import { MagnetItem } from '../types';

const router = express.Router();

// Special route for handling specific crawl requests
router.get('/special', async (req, res) => {
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

		const linkMap = new Map<string, string>();

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

// Function for crawling pages with Puppeteer
export const crawlPages = async (
	baseUrl: string,
	date: string
): Promise<MagnetItem[]> => {
	try {
		const baseWithoutDate = baseUrl.replace('/date', '');
		const formattedDate = moment(date).format('YYYY/MM/DD');

		let browser = null;
		let linkMap = new Map<string, string>();

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
							document.querySelectorAll('a[href*="magnet:"]')
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
				url: link,
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

export default router;
