const path = require('path');
const express = require('express');
const kurentoServer = require('./main/kurentoServer');
const config = require('./main/kurentoConfig.json');
const app = express();

// node < 7.x
Object.values = Object.values || Object.keys(obj).map(key => obj[key]);

kurentoServer(app, config);
app.use(express.static(path.join(__dirname, './dist')));
