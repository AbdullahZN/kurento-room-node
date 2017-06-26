const path = require('path');
const express = require('express');
const kurentoServer = require('./main/kurentoServer');
const app = express();
const config = require('./main/kurentoConfig.json');

// node < 7.x
Object.values = Object.values || (obj => (obj ? Object.keys(obj).map(key => obj[key]) : []) );

kurentoServer(app, config);
app.use(express.static(path.join(__dirname, './dist')));
