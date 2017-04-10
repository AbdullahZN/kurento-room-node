const fs      = require('fs');
const path    = require('path');
const https   = require('https');
const express = require('express');
const config  = require('./kurentoConfig.json');
const app     = express();

const port = config.server.port;
const opts = {
  key:  fs.readFileSync(config.secure.key),
  cert: fs.readFileSync(config.secure.cert)
};

app.use(express.static(path.join(__dirname, config.server.static)));
const server = https.createServer(opts, app).listen(port, (err) => {
  console.log(err || `Listening at ${config.server.uri}:${port}`)
});

const kurentoRoom = require('./main/roomManager');
const roomManager = new kurentoRoom(server, config.kmsUri);
