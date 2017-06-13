const path = require('path');
const express = require('express');
const kurentoServer = require('./main/kurentoServer');
const app = express();
const config = require('./main/kurentoConfig.json');

kurentoServer(app, config);
app.use(express.static(path.join(__dirname, './dist')));
