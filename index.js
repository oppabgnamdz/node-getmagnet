console.log('hola');
const express = require('express');
const moment = require('moment');
const rp = require('request-promise');
const jsdom = require('jsdom');
const request = require('supertest');
var cors = require('cors');
require('dotenv').config();
const http = require('http');
const ObjectsToCsv = require('objects-to-csv');
const { JSDOM } = jsdom;
const got = require('got');
var path = require('path');
const app = express();
app.use(cors());

app.get('/', (req, res) => {
	res.status(200);
	return res.status(200).json([]);
});
app.get('/torrent', async (req, res) => {
	try {
		const date = req.query?.date;
		let start = 0;
		let end = 200;
		let host = `https://jav-torrent.org/date/${moment(date).format(
			'YYYY-MM-DD'
		)}?page=`;
		const url = (index) => {
			return `${host}${index}`;
		};
		try {
			let data = [];
			for (let j = parseInt(start); j < parseInt(end); j++) {
				const html = await rp(url(j + 1));
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
			req.query?.date || moment().subtract(1, 'd').format('YYYY/MM/DD');
		let start = 0;
		let end = 20;
		let base = 'https://www.141jav.com';
		let host = `https://www.141jav.com/date/${moment(date).format(
			'YYYY/MM/DD'
		)}?page=`;
		const url = (index) => {
			return `${host}${index}`;
		};

		try {
			let data = [];
			for (let j = parseInt(start); j < parseInt(end); j++) {
				const html = await got(url(j + 1));

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
	// const vgmUrl = 'https://www.141jav.com/date/2022/08/06?page=1';
	// const test = await got(vgmUrl);
	// console.log({ test });
	try {
		const date = req.query?.date;
		let start = 0;
		let end = 200;
		let base = 'https://www.141jav.com';
		let host = `https://www.141jav.com/date/${moment(date).format(
			'YYYY/MM/DD'
		)}?page=`;
		const url = (index) => {
			return `${host}${index}`;
		};
		try {
			let data = [];
			for (let j = parseInt(start); j < parseInt(end); j++) {
				const html = await got(url(j + 1));

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
		const minusDate = parseInt(req.query?.date.split(',')[0]);
		if (isNaN(minusDate)) {
			return res.status(200).json([]);
		}
		console.log({ minusDate });
		const side = req.query?.date.split(',')[1];
		console.log('🚀 ~ file: index.js ~ line 174 ~ app.get ~ side', side);
		const date = moment().subtract(minusDate, 'd').format('YYYY/MM/DD');
		console.log({ date });
		const client = request(req.app);
		let torrents;
		side === 'j'
			? (torrents = await client.get(`/test?date=${date}`))
			: (torrents = await client.get(`/torrent?date=${date}`));
		return res.status(200).json(JSON.parse(torrents.text));
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
