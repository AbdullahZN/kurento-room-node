# kurento-room-node

Kurento Room Server in NodeJS

### Installation
Install package from npm or yarn
```bash
> npm install kurento-room-server || yarn add kurento-room-server
```

### Usage

The server is a simple module designed to work on top of ExpressJS, and requires loading a JSON config file.

Client side implementation resides in static/ folder

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

### Run demo

The project has three npm scripts :

**setup**, which installs every dependencies

```bash
npm run setup
```

**dev**, which runs app with webpack  

```bash
npm run dev
```

**demo**, which runs previous steps

```bash
npm run demo
```
