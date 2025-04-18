/* eslint-disable no-undef */
//Load from .env files
require('dotenv').config()

const PORT = process.env.PORT || 3001
const MONGODB_URI = process.env.MONGODB_URI
const PASS = process.env.PASS

module.exports = {
	PORT,
	MONGODB_URI,
	PASS
}