const fs = require('fs');
const https = require('https');
const RoomManager = require('./RoomManager');

module.exports = (app, config) => {
    const port = config.server.port;
    const uri = `${config.server.uri}:${port}`;
    const opts = {
        key: fs.readFileSync(config.secure.key),
        cert: fs.readFileSync(config.secure.cert)
    };
    const server = https.createServer(opts, app).listen(port, (err) =>
        console.log(err || `Listening at ${uri}`)
    );
    const roomManager = new RoomManager(server, config.kmsUri);

    process.on('SIGINT', () => {
        Object.values(roomManager.rooms).forEach(({ pipeline }) => pipeline.release());
        console.log('\nPress Ctrl-C again to exit');
        process.on('SIGINT', () => process.exit(0));
    });

    return roomManager;
}
