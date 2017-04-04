const io            = require('socket.io');
const Participant   = require('./Participant');
const kurentoClient = require('kurento-client');

module.exports = class kurentoRoom {
    constructor(server, kmsUri) {
        this.kurento = kurentoClient(kmsUri);
        io(server).on('connection', socket => new Participant(socket, this));

        this.rooms = {};
        this.participantsById = {};
        this.participantsByName = {};

        this.Ice = kurentoClient.getComplexType('IceCandidate');
    }

    registerParticipant(participant) {
        this.participantsById[participant.id] = participant;
        this.participantsByName[participant.name] = participant;
    }

    unregisterParticipant(id) {
        const participant = this.participantsById[id];
        const name = participant.name;
        const roomName = participant.roomName;

        this.removeParticipantFromRoom(roomName, id);
        delete this.participantsById[id];
        delete this.participantsByName[name];
    }

    createAndStoreRoomObject(roomName, pipeline) {
        console.log(`Created new room ${roomName}`);
        this.rooms[roomName] = {
            name: roomName,
            pipeline: pipeline,
            participants: {}
        };
        return this.rooms[roomName];
    }

    createPublisherEndpoint(room, participant) {
        const pid = participant.id;
        room.pipeline.create('WebRtcEndpoint', (error, endpoint) => {
            if (error) return console.error('Error creating Endpoint', error);

            endpoint.setMaxVideoSendBandwidth(30);
            endpoint.setMinVideoSendBandwidth(20);
            participant.publisher = endpoint;

            const candidates = participant.getCandidates(pid) || [];
            candidates.forEach(() => {
                console.error(`${pid} collect candidate for publisher endpoint`);
                participant.publisher.addIceCandidate(candidates.shift().candidate);
            });

            participant.publisher.on('OnIceCandidate', ({candidate}) => {
                participant.notifyClient('iceCandidate', {
                    sessionId: pid,
                    candidate: this.Ice(candidate)
                });
            });

            participant.notifyClient('startLocalStream');
            participant.notifyClient('existingParticipants', Object.keys(room.participants));
            Object.values(room.participants).forEach(participant =>
                participant.notifyClient('newParticipant', pid)
            );
            room.participants[pid] = participant;
        });
    }

    addRoom(roomName, participant) {
        this.kurento.create('MediaPipeline', (error, pipeline) => {
            if (error) return console.error('Error creating pipeline', error);
            const room = this.createAndStoreRoomObject(roomName, pipeline);
            this.createPublisherEndpoint(room, participant);
        });
    }

    getRoom(roomName) {
      return this.rooms[roomName] || null;
    }

    addParticipantToRoom(roomName, participant) {
        const existingRoom = this.getRoom(roomName);
        existingRoom
            ? this.createPublisherEndpoint(existingRoom, participant)
            : this.addRoom(roomName, participant);
    }

    removeParticipantFromRoom(roomName, id) {
        delete this.rooms[roomName].participants[id];
    }

    getParticipantById(id) {
      return this.participantsById[id] || null;
    }

    getParticipantByName(name) {
        return this.participantsByName[name] || null;
    }

    getParticipantsByRoom(roomName) {
        return this.rooms[roomName] ? this.rooms[roomName].participants : null;
    }
}
