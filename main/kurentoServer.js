const fs = require('fs');
const https = require('https');
const RoomManager = require('./roomManager');
const config = require('./kurentoConfig.json');

module.exports = (app) => {

    const port = config.server.port;
    const uri = `${config.server.uri}:${port}`;
    const opts = {
        key: fs.readFileSync(__dirname + config.secure.key),
        cert: fs.readFileSync(__dirname + config.secure.cert)
    };
    const server = https.createServer(opts, app).listen(port, (err) =>
        console.log(err || `Listening at ${uri}`)
    );
    const roomManager = new RoomManager(server, config.kmsUri);

    process.on('SIGINT', () => {
        Object.values(roomManager.rooms).forEach(({ pipeline }) => pipeline.release());
        console.log('\nPipelines released, Press Ctrl-C again to exit');
        process.on('SIGINT', () => process.exit(0));
    });

    return { uri };
}
