import express from 'express';
import moment from 'moment';
import got from 'got';
import { JSDOM } from 'jsdom';
import ObjectsToCsv from 'objects-to-csv';
import path from 'path';
import { renderFile } from '../utils';

const router = express.Router();

// JAV route
router.get('/jav', async (req, res) => {
	try {
		const date = req.query.date as string;
		let start = 0;
		let end = 200;
		let base = 'https://onejav.com';
		let host = `https://onejav.com/${moment(date).format('YYYY/MM/DD')}?page=`;
		const url = (index: number) => {
			return `${host}${index}`;
		};
		try {
			let data: string[] = [];
			for (
				let j = parseInt(start.toString());
				j < parseInt(end.toString());
				j++
			) {
				const html = await got(url(j + 1), {
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

				const dom = new JSDOM(`${html.body}`);
				var arr: string[] = [],
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
			renderFile(res, date as string, 'jav');
			return res.sendFile(path.join(__dirname, `../../jav-${date}.csv`));
		} catch (e: any) {
			console.log({ e });
			res.status(200).json({ data: 'error' });
		}
		return res.status(200).json({ data: [] });
	} catch (e: any) {
		return res.status(200).json({ data: [] });
	}
});

export default router;
