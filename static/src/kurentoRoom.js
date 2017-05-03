import io from 'socket.io-client';
import EventEmitter from 'event-emitter3';
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
    }

    leaveRoom() {
        user.endpoint.dispose();
        socket.disconnect();
        participants = {};
    }

    receiveRemoteVideo(newParticipant) {
        console.log(`${this.id} receiving video from ${newParticipant.id}`);

            const participant = new Participant(newParticipant);
            participants[newParticipant.id] = participant;
            participant.name = newParticipant.name;

            const options = {
                onicecandidate: (candidate) => sendRequest('onIceCandidate', { candidate, senderId: newParticipant.id })
            };

            participant.endpoint = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function (error) {
                if (error) return console.error(error);

                this.generateOffer((error, sdpOffer) => {
                    sendRequest('receiveRemoteVideo', { senderId: newParticipant.id, sdpOffer: sdpOffer });
                });
            });
    }

    dispose() {
        console.log(`Disposing participant ${this.id}`);
        this.endpoint.dispose();
        this.endpoint = null;
    }
};

socket
.on('id', currentUser => {
    console.log(`receive id : ${currentUser.id}`);
    user = new Participant(currentUser);
})

.on('registered', msg => console.log(msg))

.on('newMessage', ({ message, from }) => ee.emit('newMessage', { msg: message, from }) )

.on('newParticipant', newParticipant => user.receiveRemoteVideo(newParticipant))

.on('startLocalStream', () => {
    const options = {
        onicecandidate: (candidate) => sendRequest('onIceCandidate', { candidate, senderId: user.id })
    };
    user.endpoint = new kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function (error) {
        if (error) return console.error(error);
        this.generateOffer((error, sdpOffer) => sendRequest('receiveOwnVideo', sdpOffer));
    });
})

.on('existingParticipants', participant => {
    console.log('Current room participant', participant);
    user.receiveRemoteVideo(participant);
})

.on('iceCandidate', ({sessionId, candidate}) => {
    console.log(`iceCandidate from ${sessionId}`);
    const participant = getParticipant(sessionId);
    participant.endpoint.addIceCandidate(candidate, error =>
        error && console.error("Error adding candidate to self : " + error)
    );
})

.on('participantLeft', participantId => {
    console.log(`participantLeft : ${participantId}`);
    ee.emit('participantLeft', participantId);
    const participant = getParticipant(participantId);
    participant.dispose();
    delete participants[participantId];
})

.on('receiveVideoAnswer', ({ sessionId, sdpAnswer }) => {
    console.log(`receiveVideoAnswer from : ${sessionId}`, sdpAnswer);
    const participant = getParticipant(sessionId);

    participant.endpoint.processAnswer(sdpAnswer, function (error) {
        if (error) return console.error('Error processing Answer', error);

        participant.candidates.forEach(() => {
            console.log(`Collected : ${participant.id} ICE candidate`);
            participant.endpoint.addIceCandidate(participant.candidates.shift());
        });

        const video = document.createElement('video');
        const pc = participant.endpoint.peerConnection;
        const stream = pc.getRemoteStreams()[0] || pc.getLocalStreams()[0];

        video.src = window.URL.createObjectURL(stream);
        participant.video = video;
        ee.emit('newParticipant', participant);
        document.getElementById('video-list').appendChild(video);
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
