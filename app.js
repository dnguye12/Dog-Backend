const express = require("express");
const config = require("./utils/config");
require("express-async-errors");
const app = express();
const cors = require("cors");
const path = require("path");

//all the routers
const predictRouter = require("./controllers/predict")

const middleware = require("./utils/middleware");
const logger = require("./utils/logger");

//connect to mongoose database
const mongoose = require("mongoose");

mongoose.set("strictQuery", false);

logger.info("connecting to", config.MONGODB_URI);

mongoose
  .connect(config.MONGODB_URI)
  .then(() => {
    logger.info("connected to MongoDB");
  })
  .catch((error) => {
    logger.error("error connecting to MongoDB:", error.message);
  });

app.use(cors());
app.use(express.static("dist"));
app.use(express.json());
app.use(middleware.requestLogger);

//divide url for frontend and backend
app.use(express.static(path.join(__dirname, "dist")));

//backend only listen to these url
app.use("/api/predict", predictRouter)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app;