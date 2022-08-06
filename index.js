console.log('hola');
const express = require('express');
const moment = require('moment');
const rp = require('request-promise');
const jsdom = require('jsdom');
var cors = require('cors');
require('dotenv').config();
const ObjectsToCsv = require('objects-to-csv');
const { JSDOM } = jsdom;
var path = require('path');
const app = express();
app.use(cors());
app.get('/', (req, res) => {
	res.status(200);
	res.send('Welcome to root URL of Server1');
});
app.get('/csv', async (req, res) => {
	try {
		const date = req.query?.date;
		const type = req.query?.type;
		console.log({ date });
		console.log({ type });

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
				console.log('url', url(j + 1));
				const html = await rp(url(j + 1));
				console.log('hehe');
				const dom = new JSDOM(`${html}`);
				var arr = [],
					l = dom.window.document.links;

				for (var i = 0; i < l.length; i++) {
					arr.push(l[i].href);
				}
				const breakPage = arr.find((item) => item.includes('/date/'));
				if (!breakPage) {
					break;
				}

				const needArr = arr.filter((item) => item.includes('/download/'));
				const haveDomain = needArr.map((item) => item);
				data = [...data, ...haveDomain];
			}
			const mapping = data.map((item, index) => {
				return { url: item };
			});

			console.log({ mapping });
			const csv = new ObjectsToCsv(mapping);
			await csv.toDisk('./test.csv');
			console.log('path', path.join(__dirname, 'test.csv'));
			return res.sendFile(path.join(__dirname, 'test.csv'));
		} catch (e) {
			console.log({ e });
			res.status(200).json({ data: 'error' });
		}
		return res.status(200).json({ data: [] });
	} catch (e) {
		return res.status(200).json({ data: [] });
	}
});

app.listen(process.env.PORT, () =>
	console.log('Example app listening on port 3000!')
);
process.on('uncaughtException', (err) => {
	console.log({ err });
	process.exit();
});
