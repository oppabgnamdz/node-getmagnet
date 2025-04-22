// Import các dependencies
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import routes from './src/routes';
import { connectToMongo } from './src/utils';

// Create Express application
const app = express();
app.use(cors());

// Use routes
app.use('/', routes);

// Bắt tất cả các lỗi không được xử lý
process.on('uncaughtException', (err) => {
	console.error('UNCAUGHT EXCEPTION - Shutting down!');
	console.error(err.name, err.message);
	console.error(err.stack);
	process.exit(1);
});

process.on('unhandledRejection', (err: Error) => {
	console.error('UNHANDLED REJECTION - Shutting down!');
	console.error(err.name, err.message);
	console.error(err.stack);
	process.exit(1);
});

// Initialize MongoDB connection when starting the server
connectToMongo()
	.then(() => {
		// Tạo server HTTP
		const server = createServer(app);
		const port = process.env.PORT || 3000;

		server.listen(port, () => {
			console.log(`Server running on port ${port}`);
		});

		// Xử lý lỗi SIGTERM
		process.on('SIGTERM', () => {
			console.log('SIGTERM received. Shutting down gracefully');
			server.close(() => {
				console.log('Process terminated');
			});
		});
	})
	.catch((err) => {
		console.error('Failed to connect to MongoDB on startup', err);
		process.exit(1);
	});
