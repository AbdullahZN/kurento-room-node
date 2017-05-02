#
kurento-room-node

Kurento Room Implementation in NodeJS & VueJS

### File structure

###### NodeJS Server

```
/
keys/ : self signed certificates
main/ : kurento related modules
main.js : basic kurento server implementation
```

###### VueJS Client

```
static/
build/ : webpack scripts
config/ : webpack config
src/
kurentoRoom.js : kurento room client
```

---

## Server

The server is a simple module designed to work on top of ExpressJS.

Here's a simple use case found in main.js. The same process can be used inside a dev environment.

```
const path = require('path');
const express = require('express');
const kurentoServer = require('./main/kurentoServer');
const app = express();

kurentoServer(app);
app.use(express.static(path.join(__dirname, './static')));
```

## Client

All the room client logic resides inside kurentoRoom.js \(cf. file structure \) and exports core functionalities as follows

```
kurentoRoom.
on(event, callback) => Event listener (see events section below)
start(userName, roomName) => joins room and starts call
chatAll(message) => send text chat to other participants
leaveRoom() => leaves room
```

#### on Events

List of room related events you can listen to :

* 'newMessage'
* New global chat message
* 'newParticipant'
* Participant joined same room
* 'participantLeft'
* Participant left room

---

### NPM Scripts

to use via 'npm run' :

```
setup // Installs all npm packages
demo // Runs client
init // setup && demo
prod // Builds for production & runs server
```
