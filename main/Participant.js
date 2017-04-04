module.exports = class Participant {
    constructor(socket, roomManager) {
        this.socket = socket;
        this.id = socket.id;
        this.roomManager = roomManager;

        this.name = null;
        this.roomName = null;
        this.publisher = null;
        this.subscribers = {};
        this.candidates = {};

        socket
        .emit('id', this.id)
        .on('error', id => this.leaveRoom(id))
        .on('disconnect', id => this.leaveRoom(id))
        .on('leaveRoom', id => this.leaveRoom(id))
        .on('register', name => this.register(name))
        .on('joinRoom', roomName => this.joinRoom(roomName))
        .on('receiveOwnVideo', sdpOffer => this.receiveOwnVideo(sdpOffer))
        .on('receiveRemoteVideo', payload => this.receiveRemoteVideo(payload))
        .on('onIceCandidate', payload => this.onIceCandidate(payload))
        .on('chatAll', message => this.chatAll(message));
        console.log(`New client : ${this.id}`);
    }

    newSubscriberEndpoint(sender, pipeline) {
        const endpoint = pipeline.create('WebRtcEndpoint');
        console.log(`${this.id} > successfully created subscriber endpoint`);
        endpoint.setMaxVideoSendBandwidth(30);
        endpoint.setMinVideoSendBandwidth(20);
        this.subscribers[sender.id] = endpoint;

        this.candidates[sender.id] = this.candidates[sender.id] || [];
        this.candidates[sender.id].forEach((candidate) => {
            console.log(`${this.id} collect candidate for : ${sender.id}`);
            endpoint.addIceCandidate(candidate);
        });

        endpoint.on('OnIceCandidate', (event) => {
            console.log(`${this.id} > generate subscriber candidate from ${sender.id}`);
            const candidate = this.roomManager.Ice(event.candidate);
            this.notifyClient('iceCandidate', {sessionId: sender.id, candidate: candidate});
        });

        return endpoint;
    }

    connectToRemoteParticipant(endpoint, sender, sdpOffer) {
        const senderId = sender.id;
        sender.publisher.connect(endpoint);
        endpoint.processOffer(sdpOffer, (error, sdpAnswer) => {
            console.log(`${this.id} > processing offer from ${sender.id}`);
            if (error) return console.error("Error in Processing offer", error);
            this.notifyClient('receiveVideoAnswer', { sessionId: senderId, sdpAnswer: sdpAnswer });
            endpoint.gatherCandidates((error) => error && console.error("Error gathering candidates", error));
        });
    }

    receiveOwnVideo(sdpOffer) {
        this.connectToRemoteParticipant(this.publisher, this, sdpOffer);
    }

    receiveRemoteVideo({ senderId, sdpOffer }) {
        const sender = this.roomManager.getParticipantById(senderId);
        const room = this.roomManager.getRoom(this.roomName);

        ( this.getSubscriber(senderId) || this.newSubscriberEndpoint(sender, room.pipeline) )
        .then(endpoint => this.connectToRemoteParticipant(endpoint, sender, sdpOffer));
    }

    addSubsriberCandidate(senderId, candidate) {
        const subscriber = this.subscribers[senderId];

        subscriber
            ? subscriber.addIceCandidate(candidate)
            : this.candidates[senderId].push({ candidate: candidate });

        console.log(`${this.id} > Adding candidate from ${senderId}`);
    }

    addPublisherCandidate(senderId, candidate) {
        this.publisher
            ? this.publisher.addIceCandidate(candidate)
            : this.candidates[senderId].push({ candidate: candidate });

        console.log(`${this.id} > Adding own candidate`);
    }

    leaveRoom() {
        this.publisher.release();
        Object.values(this.subscribers).forEach(endpoint => endpoint.release());
        this.roomManager.unregisterParticipant(this.id);
        console.log(`Removed participant ${this.id}`);
    }

    register(name) {
        console.log(`${this.id} > registered with name ${name}`);
        this.name = name;
        this.roomManager.registerParticipant(this);
        this.notifyClient('registered', `Successfully registered ${this.id}`);
    }

    joinRoom(roomName) {
        console.log(`${this.id} > requested to join room ${roomName}`);
        this.roomName = roomName;
        this.roomManager.addParticipantToRoom(roomName, this);
    }

    onIceCandidate({ senderId, candidate }) {
        const iceCandidate = this.roomManager.Ice(candidate);

        this.candidates[senderId] = this.candidates[senderId] || [];
        senderId == this.id
            ? this.addPublisherCandidate(senderId, iceCandidate)
            : this.addSubsriberCandidate(senderId, iceCandidate);
    }

    chatAll(data) {
        console.log(`${id} > receive message from ${data.id}`);
    }

    notifyClient(notification, data) {
        this.socket.emit(notification, data);
    }

    getCandidates(id) {
        return this.candidates[id];
    }

    getSubscriber(id) {
        return this.subscribers[id];
    }
}
