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
app.use(cors());

const folders = [
	{
		id: 'LJOFNlj4y6k',
		name: 'folder 1',
	},
	{
		id: 'fu7gktctwFk',
		name: 'folder 10',
	},
	{
		id: 'IGjWAqHhbGc',
		name: 'folder 2',
	},
	{
		id: 'TR13njFeG7I',
		name: 'folder 3',
	},
	{
		id: 'KPxsc3FwKno',
		name: 'folder 4',
	},
	{
		id: 'bq4CNXmyaO8',
		name: 'folder 5',
	},
	{
		id: 'dhmeCyZJVX0',
		name: 'folder 6',
	},
	{
		id: 'TZbdVbGMOhU',
		name: 'folder 7',
	},
	{
		id: 'VrQk6G-UPJ0',
		name: 'folder 8',
	},
	{
		id: 'C_-0byaygXA',
		name: 'folder 9',
	},
];
const BASE_URL = 'https://onejav.com';

const fetchPage = throttle(async (url) => {
	try {
		const response = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
			},
			timeout: 30000,
		});
		return response.data;
	} catch (error) {
		console.error(`Error fetching ${url}:`, error.message);
		return null;
	}
}, 1000);

//test
app.get('/', async (req, res) => {
	try {
		const name = req.query.name;

		const data = new URLSearchParams();
		data.append('filename', `${name}.mp4`);
		data.append('server', '1000000');
		data.append('submit', 'GET+THE+VIDEO+LINK+-+CLICK+HERE');
		const response = await axios.post(
			'https://javpark.net/embed/watch.php',
			data,
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		);
		const html = response.data;
		const $ = cheerio.load(html);
		const streamtapeLinks = $('a[href*="streamtape.com"]');
		const arrLink = [];
		streamtapeLinks.each((index, link) => {
			const href = $(link).attr('href');
			console.log(href);
			arrLink.push(href);
		});
		return res.status(200).json(arrLink);
	} catch (e) {
		return res.status(200).json();
	}
});

const requestTape = async (name) => {
	try {
		const data = new URLSearchParams();
		let arrayVideo = [];
		data.append('filename', name);
		data.append('server', '1000000');
		data.append('submit', 'GET+THE+VIDEO+LINK+-+CLICK+HERE');
		const response = await axios.post(
			'https://javpark.net/embed/watch.php',
			data,
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
			}
		);
		const html = response.data;
		const $ = cheerio.load(html);
		const streamtapeLinks = $('a[href*="streamtape.com"]');

		streamtapeLinks.each((index, link) => {
			const href = $(link).attr('href');
			arrayVideo.push(href);
		});
		return arrayVideo;
	} catch (e) {
		return res.status(200).json([]);
	}
};

function getMovieCode(url) {
	const baseUrl = 'https://javpark.net/';
	if (!url.startsWith(baseUrl)) {
		return null;
	}
	const path = url.substring(baseUrl.length);
	const parts = path.split('-');
	if (parts.length < 2) {
		return null;
	}
	const code = `${parts[0]}-${parts[1]}`;
	return code;
}

app.get('/park', async (req, res) => {
	try {
		const page = req.query.page;
		if (!page) return res.status(200).json([]);
		requestUrl(
			`https://javpark.net/page/${page}/`,
			async (error, response, body) => {
				if (error) {
					console.log(error);
					return res.status(200).json([]);
				}
				const $ = cheerio.load(body);
				const bookmarkLinks = [];
				$('a[rel="bookmark"]').each((index, element) => {
					const href = $(element).attr('href');
					bookmarkLinks.push(requestTape(getMovieCode(href)));
				});
				const promiseAll = await Promise.all(bookmarkLinks);

				return res.status(200).json(promiseAll.flatMap((item) => item));
			}
		);
	} catch (e) {
		return res.status(200).json([]);
	}
});

app.get('/tape', async (req, res) => {
	try {
		const { name, min, max } = req.query;

		let arrayPromise = [];
		let arrayVideo = [];
		//`${name}-${index.toString().padStart(3, '0')}.mp4`
		for (let index = min; index <= max; index++) {
			arrayPromise.push(
				requestTape(`${name}-${index.toString().padStart(3, '0')}.mp4`)
			);
		}
		const promiseAll = await Promise.all(arrayPromise);
		console.log(
			'test',
			promiseAll.flatMap((item) => item)
		);
		return res.status(200).json(promiseAll.flatMap((item) => item));
	} catch (e) {
		return res.status(200).json([]);
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
app.get('/test', async (req, res) => {
	try {
		const date =
			req.query.date || moment().subtract(1, 'd').format('YYYY/MM/DD');
		const page =
			req.query.page === 'undefined' ? null : parseInt(req.query.page);
		const formattedDate = moment(date).format('YYYY/MM/DD');
		console.log({ page, date });
		const crawlPages = async (start, end) => {
			let allLinks = [];
			for (let j = start; j < end; j++) {
				const pageUrl = `${BASE_URL}/${formattedDate}?page=${j + 1}`;
				console.log({ pageUrl });
				const html = await fetchPage(pageUrl);
				if (!html) continue;

				const $ = cheerio.load(html);
				const links = $('a[href*="/torrent/"][href$=".torrent"]')
					.map((_, el) => $(el).attr('href'))
					.get();
				console.log({ links });
				if (links.length === 0) break;
				allLinks = [...allLinks, ...links];
			}
			console.log({ allLinks });
			return allLinks.map((link) => `${BASE_URL}${link}`);
		};

		let result;
		if (page) {
			result = await crawlPages(page - 1, page);
		} else {
			result = await crawlPages(0, 200);
		}

		res.json(result);
	} catch (e) {
		console.error('Error:', e);
		res.status(500).json({ error: 'An error occurred while crawling' });
	}
});

app.get('/upload', async (req, res) => {
	try {
		const randomIndex = Math.floor(Math.random() * folders.length);
		let randomId = folders[randomIndex].id;
		const url = req.query.url;
		console.log({ url });
		const response = await axios.get(
			`https://api.streamtape.com/remotedl/add?login=${process.env.LOGIN}&key=${process.env.PASS}&url=${url}&folder=${randomId}`
		);
		console.log('data', response.data);
		return res.status(200).json({ data: response.data });
	} catch (e) {
		return res.status(200).json([]);
	}
});
function wait(ms) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}
app.get('/render-direct', async (req, res) => {
	try {
		// example adn-185
		const name = req.query?.name;
		if (!name) return res.status(200).json([]);

		// get list folder and file

		const folderAndFile = await axios.get(
			`https://api.streamtape.com/file/listfolder?login=${process.env.LOGIN}&key=${process.env.PASS}`
		);
		console.log('hola', folderAndFile.data);
		const findFile = folderAndFile.data.result.files.find((item) => {
			const nameItemLower = item.name.toLowerCase();
			const nameSearchLower = name.toLowerCase();
			return nameItemLower.includes(nameSearchLower);
		});
		console.log({ findFile });
		const id = findFile?.linkid;
		if (!id) return res.status(200).json([]);

		// create ticket
		const response = await axios.get(
			`https://api.streamtape.com/file/dlticket?file=${id}&login=${process.env.LOGIN}&key=${process.env.PASS}`
		);
		console.log('response create ticket', response.data);
		let ticket = response.data.result.ticket;
		console.log({ ticket });
		await wait(5000);
		const createStream = await axios.get(
			`https://api.streamtape.com/file/dl?file=${id}&ticket=${ticket}`
		);
		console.log('response create stream', createStream.data);
		return res.status(200).json([createStream.data.result.url]);
	} catch (e) {
		return res.status(200).json([]);
	}
});

app.get('/ppv', async (req, res) => {
	try {
		const date =
			req.query.date || moment().subtract(1, 'd').format('YYYY/MM/DD');
		const page = req.query.page === 'undefined' ? null : req.query.page;

		let start = 0;
		let end = 200;
		let base = 'https://www.141ppv.com';
		let host = `https://www.141ppv.com/date/${moment(date).format(
			'YYYY/MM/DD'
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
					const mapping = data.map((item, index) => {
						return base + item;
					});
					return res.send(mapping);
					break;
				}

				const needArr = arr.filter((item) => item.includes('/download/'));
				const haveDomain = needArr.map((item) => item);
				data = [...data, ...haveDomain];
			}
			if (page) {
				console.log({ data });
				const mapping = data.map((item, index) => {
					return base + item;
				});
				return res.send(mapping);
			}
		} catch (e) {
			console.log({ e });
			return res.status(200).json([]);
		}
		return res.status(200).json([]);
	} catch (e) {
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
app.get('/special', async (req, res) => {
	try {
		const minusDate = parseInt(req.query.date.split(',')[0]);
		if (isNaN(minusDate)) {
			return res.status(200).json([]);
		}
		console.log({ minusDate });
		const side = req.query.date.split(',')[1];
		const page = req.query.date.split(',')[2];
		console.log('🚀 ~ file: index.js ~ line 174 ~ app.get ~ side', page);
		const date = moment().subtract(minusDate, 'd').format('YYYY/MM/DD');
		console.log({ date });
		const client = request(req.app);
		let torrents;
		switch (side) {
			case 'j':
				const formattedDate = moment(date).format('YYYY/MM/DD');
				console.log({ formattedDate });
				const crawlPages = async (start, end) => {
					let allLinks = [];
					for (let j = start; j < end; j++) {
						const pageUrl = `${BASE_URL}/${formattedDate}?page=${j + 1}`;
						console.log({ pageUrl });
						const html = await fetchPage(pageUrl);
						if (!html) continue;

						const $ = cheerio.load(html);
						const links = $('a[href*="/torrent/"][href$=".torrent"]')
							.map((_, el) => $(el).attr('href'))
							.get();
						console.log({ links });
						if (links.length === 0) break;
						allLinks = [...allLinks, ...links];
					}
					console.log({ allLinks });

					return allLinks.map((link) => `${BASE_URL}${link}`);
				};

				if (page) {
					torrents = await crawlPages(parseInt(page) - 1, parseInt(page));
				} else {
					torrents = await crawlPages(0, 200);
				}
				console.log({ torrents });
				break;
			case 'f':
				torrents = await client.get(`/ppv?date=${date}&page=${page}`);
				break;

			default:
				torrents = await client.get(`/torrent?date=${date}&page=${page}`);
				torrents = JSON.parse(torrents.text);
				break;
		}
		console.log('clgt', torrents);
		return res.status(200).json(torrents);
	} catch (e) {
		return res.status(200).json([]);
	}
});

app.get('/total', async (req, res) => {
	try {
		let arrPageThreeDays = [];
		for (let minusDate = 0; minusDate < 3; minusDate++) {
			console.log({ minusDate });

			const date = moment().subtract(minusDate, 'd').format('YYYY/MM/DD');
			console.log({ date });
			const client = request(req.app);
			let [torrentsJ, torrentP] = await Promise.all([
				client.get(`/test?date=${date}`),
				client.get(`/torrent?date=${date}`),
				// client.get(`/torrent?date=${date}`),
			]);

			console.log('vcl', JSON.parse(torrentsJ.text).length);
			// arrPageThreeDays.push({
			// 	[`today${minusDate}`]: {
			// 		torrentsJ: JSON.parse(torrentsJ.text).length,
			// 		torrentP: JSON.parse(torrentP.text).length,
			// 		// torrentT: JSON.parse(torrentT.text).length,
			// 	},
			// });
			arrPageThreeDays.push(JSON.parse(torrentsJ.text).length);
			arrPageThreeDays.push(JSON.parse(torrentP.text).length);
			// arrPageThreeDays.push(JSON.parse(torrentT.text).length);
		}

		return res.status(200).json(arrPageThreeDays);
	} catch (e) {
		return res.status(200).json([]);
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

app.listen(process.env.PORT, () =>
	console.log('Example app listening on port 3000!')
);
process.on('uncaughtException', (err) => {
	console.log({ err });
	process.exit();
});
