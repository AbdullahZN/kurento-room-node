const io            = require('socket.io');
const kurentoClient = require('kurento-client');
const Participant   = require('./participant');

module.exports = class RoomManager {
    constructor(server, kmsUri) {
        this.kurento = kurentoClient(kmsUri);
        io(server).on('connection', socket => new Participant(socket, this));

        this.rooms = {};
        this.participantsById = {};

        this.Ice = kurentoClient.getComplexType('IceCandidate');
    }

    registerParticipant(participant) {
        this.participantsById[participant.id] = participant;
    }

    unregisterParticipant(id, roomName) {
        const participant = this.participantsById[id] || null;
        const room = this.rooms[roomName];
        if (!participant || !room) return;

        delete room.participants[id];
        // Release subscriber endpoint of other participants
        Object.values(room.participants).forEach(other => {
            if (other.subscribers[id]) {
              other.subscribers[id].release();
              delete other.subscribers[id];
          };
        });
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

            endpoint.setMaxVideoSendBandwidth(300);
            endpoint.setMinVideoSendBandwidth(300);
            participant.publisher = endpoint;

            const candidates = participant.getCandidates(pid) || [];
            candidates.forEach(() => {
                participant.publisher.addIceCandidate(candidates.shift().candidate);
            });

            participant.publisher.on('OnIceCandidate', ({ candidate }) => {
                participant.notifyClient('iceCandidate', {
                    sessionId: pid,
                    candidate: this.Ice(candidate)
                });
            });

            Object.values(room.participants).forEach( ({ id, name }) => {
                participant.notifyClient('existingParticipants', { id, name });
            });

            room.participants[pid] = participant;
            participant.notifyClient('startLocalStream');
            participant.notifyOthers('newParticipant', { id: pid, name: participant.name });
        });
    }

    addRoom(roomName, participant) {
      this.kurento.create('MediaPipeline', (error, pipeline) => {
            if (error) return console.error('Error creating pipeline', error);
            const room = this.createAndStoreRoomObject(roomName, pipeline);
            participant && this.createPublisherEndpoint(room, participant);
        });
    }

    getRoom(roomName) {
      return this.rooms[roomName] || null;
    }

    addParticipantToRoom(roomName, participant) {
        const existingRoom = this.getRoom(roomName);
        participant.socket.join(roomName);
        existingRoom
            ? this.createPublisherEndpoint(existingRoom, participant)
            : this.addRoom(roomName, participant);
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
