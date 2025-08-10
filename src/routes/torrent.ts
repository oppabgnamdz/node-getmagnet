import express, { Request, Response } from 'express';
import moment from 'moment';
import rp from 'request-promise';
import { JSDOM } from 'jsdom';
import got from 'got';

const router = express.Router();

// Get torrent by date
router.get('/torrent', async (req: Request, res: Response) => {
	try {
		const date = req.query.date as string;
		let base = 'https://jav-torrent.org';
		let host = `https://jav-torrent.org/date/${moment(date).format(
			'YYYY/MM/DD'
		)}?page=`;

		const url = (index: number) => {
			return `${host}${index}`;
		};

		const page = req.query.page === 'undefined' ? null : req.query.page;
		let start = 0;
		let end = 200;
		if (page) {
			start = parseInt(page as string) - 1;
			end = parseInt(page as string);
		}
		try {
			let data: string[] = [];
			for (
				let j = parseInt(start.toString());
				j < parseInt(end.toString());
				j++
			) {
				const html = await rp(url(j + 1));
				console.log('aasdasd', url(j + 1));
				const dom = new JSDOM(`${html}`);
				var arr: string[] = [],
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
	} catch (e: any) {
		return res.status(200).json({
			data: [],
			error: e.message,
		});
	}
});

// Get ppv torrent by date
router.get('/ppv', async (req: Request, res: Response) => {
	try {
		const date = req.query.date as string;
		let base = 'https://javtorrent.re';
		const host = `${base}/date/${moment(date).format('YYYY/MM/DD')}?page=`;

		const page = req.query.page === 'undefined' ? null : req.query.page;

		let start = page ? parseInt(page as string) - 1 : 0;
		let end = page ? parseInt(page as string) : 200;

		let result: string[] = [];

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
	} catch (e: any) {
		return res.status(200).json({
			data: [],
			error: e.message,
		});
	}
});

export default router;
