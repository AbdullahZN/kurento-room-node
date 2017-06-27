# kurento-room-node

Kurento Room Server in NodeJS [![Code Climate](https://codeclimate.com/github/AbdullahZN/kurento-room-node/badges/gpa.svg)](https://codeclimate.com/github/AbdullahZN/kurento-room-node)

### Requirements
Install package from npm or yarn
```bash
> npm install kurento-room-server || yarn add kurento-room-server
```

### Usage

The server is a simple module designed to work on top of ExpressJS, and requires loading a JSON config file.

Here's a basic use case, you can find an example config file in main/kurentoConfig.json

A demo client implementation can be found in static/ folder

```js
const path = require('path');
const express = require('express');
const kurentoServer = require('kurento-room-server');
const config = require('./main/kurentoConfig.json');

const app = express();
const roomManager = kurentoServer(app, config);
app.use(express.static(path.join(__dirname, './dist')));
```

### File structure
###### NodeJS Server

```
/
  keys/     : self signed certificates
  main/     : kurento related modules
  main.js   : basic kurento server implementation
```

###### VueJS Client

```
static/
  build/           : webpack scripts
  config/          : webpack config
  src/
    kurentoRoom.js : kurento room client
```

## Client

All the room client logic resides inside kurentoRoom.js \(cf. file structure \) and exports core functionalities as follows

```
kurentoRoom.
  on(event, callback)        => Event listener (see events section below)
  start(userName, roomName)  => joins room and starts call
  chatAll(message)           => send text chat to other participants
  leaveRoom()                => leaves room
```
