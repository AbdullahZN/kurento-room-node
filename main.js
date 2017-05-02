const path = require('path');
const express = require('express');
const kurentoServer = require('./main/kurentoServer');
const app = express();

kurentoServer(app);
app.use(express.static(path.join(__dirname, './static/dist/')));
