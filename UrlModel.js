const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		unique: true,
	},
	url: {
		type: String,
		required: true,
		unique: true,
	},
});

const User = mongoose.model('User', userSchema);