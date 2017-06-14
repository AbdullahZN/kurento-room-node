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
    constructor({id, name}) {
        this.id = id;
        this.name = name;
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

    receiveRemoteVideo(newParticipant) {
      const participant = new Participant(newParticipant);
      participants[newParticipant.id] = participant;

      const options = {
          onicecandidate: (candidate) => sendRequest('onIceCandidate', { candidate, senderId: newParticipant.id })
      };

      participant.endpoint = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
          if (error) return console.error(error);

          this.generateOffer((error, sdpOffer) => {
              sendRequest('receiveRemoteVideo', { senderId: newParticipant.id, sdpOffer: sdpOffer });
          });
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

.on('startLocalStream', () => {
    const options = {
        onicecandidate: (candidate) => sendRequest('onIceCandidate', { candidate, senderId: user.id })
    };
    user.endpoint = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
        if (error) return console.error(error);
        this.generateOffer((error, sdpOffer) => sendRequest('receiveOwnVideo', sdpOffer));
    });
})

.on('existingParticipants', participant => user.receiveRemoteVideo(participant))

.on('iceCandidate', ({ sessionId, candidate }) => {
    const participant = getParticipant(sessionId);
    participant.endpoint.addIceCandidate(candidate, error => error && console.error(error));
})

.on('participantLeft', participantId => {
    ee.emit('participantLeft', participantId);
    const participant = getParticipant(participantId);
    if (!participant) return console.log(`participant with id ${participantId} not found`);
    participant.dispose();
    delete participants[participantId];
})

.on('receiveVideoAnswer', ({ sessionId, sdpAnswer }) => {
    const participant = getParticipant(sessionId);

    participant.endpoint.processAnswer(sdpAnswer, function (error) {
        if (error) return console.error('Error processing Answer', error);

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
