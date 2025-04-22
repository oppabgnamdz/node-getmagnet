import express from 'express';

const router = express.Router();

// Root route
router.get('/', async (req, res) => {
	try {
		return res.status(200).json('done');
	} catch (e) {
		return res.status(200).json({});
	}
});

// Crypto JSON route
router.get(`/crypto-json`, async (req, res) => {
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

// Fallback route - catch any unmatched routes
router.get('*', function (req, res) {
	return res.status(200).json([]);
});

export default router;
