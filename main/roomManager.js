const io            = require('socket.io');
const Participant   = require('./Participant');
const Kms           = require('./Kms');

module.exports = class kurentoRoom {
    constructor(server, kmsUri) {
        server && this.initSocketConnection(server);
        this.kms = new Kms(kmsUri);
        this.participantsByRoom = { /*  roomName: [] */ };
        this.participantsById = { /*  id : participant  */ };
        this.totalParticipants = 0;
    }

    initSocketConnection(server) {
      io(server).on('connection', socket => new Participant(socket, this));
    }

    registerParticipant(participant) {
        this.participantsById[participant.getId()] = participant;
    }

    unregisterParticipant(id, roomName) {
        const list = this.getParticipantsByRoom(roomName);
        this.participantsByRoom[roomName] = list.filter(participant => participant.id != id);
    }

    setRoomParticipantList(roomName) {
        console.log(`Created new room ${roomName}`);
        this.participantsByRoom[roomName] = [ /* participant : name */ ];
    }

    createPublisherEndpoint(roomName, participant) {
        return this.kms.newWebRtcEndpoint(roomName);
    }

    newPipeline(roomName, participant) {
        return this.kms
            .newPipeline(roomName)
            .then(pipeline => this.setRoomParticipantList(roomName))
            .catch(err => { throw new Error('Error creating pipeline', error) });
    }

    addParticipantToRoom(roomName, participant) {
        if (!participant) return;

        return (this.getPipeline(roomName) || this.newPipeline(roomName))
            .catch((err) => console.log(err))
            .then(() => this.createPublisherEndpoint(roomName, participant))
            .then(endpoint => {
                roomParticipants.push(participant.getState());
                return endpoint;
            });
    }

    getPipeline(roomName) {
        return this.kms.pipelines[roomName] || null;
    }

    getParticipantById(id) {
        return this.participantsById[id] || null;
    }

    getParticipantsByRoom(roomName) {
        return this.participantsByRoom[roomName] || null;
    }

    getEveryParticipants() {
        return this.participantsByRoom;
    }

    getKms() {
        return this.kms;
    }
}
