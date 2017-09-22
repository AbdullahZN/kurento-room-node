import io from 'socket.io-client';
import EventEmitter from 'eventemitter3';
import kurentoUtils from 'kurento-utils';

const socket = io.connect();
const ee = new EventEmitter();

// Current room participants
let participants = {};

// Current user
let user = {};

class Participant {
    constructor({ id }) {
        this.id = id;
        this.endpoint = null;
        this.candidates = [];
        this.src = null;
    }

    leaveRoom(disconnect = false) {
        user.endpoint.dispose();
        Object.values(participants).forEach(p => p.dispose());
        sendRequest('leaveRoom');
        disconnect && socket.disconnect();
        participants = {};
    }

    createParticipant(remoteParticipant) {
        const participant = new Participant(remoteParticipant);
        participants[remoteParticipant.id] = participant;
        return participant;
    }

    receiveRemoteVideo(newParticipant) {
        const senderId = newParticipant.id;
        const participant = (user.id === senderId) ? user : this.createParticipant(newParticipant);

        const options = {
            onicecandidate(candidate) {
                sendRequest('onIceCandidate', { candidate, senderId });
            }
        };
        const peerType = (user.id === senderId) ? 'WebRtcPeerSendonly' : 'WebRtcPeerRecvonly';
        participant.endpoint = kurentoUtils.WebRtcPeer[peerType](options, function (error) {
            if (error)
                return console.error(error);
            this.generateOffer((error, sdpOffer) => sendRequest('receiveVideo', { senderId, sdpOffer }));
        });
    }

    dispose() {
        if (!this.endpoint) return;
        this.endpoint.dispose();
        this.endpoint = null;
    }
};

socket
.on('id', currentUser => { user = new Participant(currentUser) })

.on('registered', msg => console.log(msg))

.on('newMessage', ({ message, from }) => ee.emit('newMessage', { msg: message, from }) )

.on('newParticipant', newParticipant => user.receiveRemoteVideo(newParticipant))

.on('existingParticipants', participants => participants.forEach(p => user.receiveRemoteVideo(p)))

.on('iceCandidate', ({ sessionId, candidate }) => {
    console.log("got iceCandidate", candidate);
    getParticipant(sessionId)
        .endpoint
        .addIceCandidate(candidate, error => error && console.error(error));
})

.on('participantLeft', participantId => {
    ee.emit('participantLeft', participantId);
    const participant = getParticipant(participantId);
    if (!participant)
        return console.log(`participant with id ${participantId} not found`);
    participant.dispose();
    delete participants[participantId];
})

.on('gotAnswer', ({ senderId, sdpAnswer }) => {
    const participant = getParticipant(senderId);

    participant.endpoint.processAnswer(sdpAnswer, function (error) {
        if (error)
            return console.error('Error processing Answer', error);

        participant.candidates.forEach(() => {
            participant.endpoint.addIceCandidate(participant.candidates.shift());
        });

        const pc = participant.endpoint.peerConnection;
        const stream = (pc.getRemoteStreams()[0] || pc.getLocalStreams()[0]);

        participant.src = window.URL.createObjectURL(stream);
        ee.emit('newParticipant', participant);
    });
})

window.onbeforeunload   = ()            => user.leaveRoom();
const sendRequest       = (type, data)  => socket.emit(type, data);
const getParticipant    = (id)          => (user.id === id ? user : participants[id]);

/*
 **   EXPORTS
 */

export const on                    = (event, fn) => ee.on(event, fn);
export const leaveRoom             = ()          => user.leaveRoom();
export const chatAll               = (message)   => socket.emit('chatAll', message);

// Kurento Room entry point
export const start = (userName, roomName) => {
    sendRequest('register', userName);
    sendRequest('joinRoom', roomName);
}
