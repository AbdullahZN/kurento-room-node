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
        .emit('id', {id: this.id, name: this.name})
        .on('error', () => this.leaveRoom())
        .on('disconnect', () => this.leaveRoom())
        .on('leaveRoom', () => this.leaveRoom())
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
        endpoint.then((endpoint) => {
          console.log(`${this.id} > successfully created subscriber endpoint for`, sender);

          endpoint.setMaxVideoRecvBandwidth(300);
          endpoint.setMinVideoRecvBandwidth(300);

          this.subscribers[sender.id] = endpoint;

          this.candidates[sender.id] = this.candidates[sender.id] || [];
          this.candidates[sender.id].forEach(({candidate}) => {
              endpoint.addIceCandidate(candidate);
          });

          endpoint.on('OnIceCandidate', (event) => {
              const candidate = this.roomManager.Ice(event.candidate);
              this.notifyClient('iceCandidate', {sessionId: sender.id, candidate: candidate});
          });
      });
        return endpoint;
    }

    connectToRemoteParticipant(endpoint, sender, sdpOffer) {
        const senderId = sender.id;
        sender.publisher.connect(endpoint);
        endpoint.processOffer(sdpOffer, (error, sdpAnswer) => {
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
    }

    addPublisherCandidate(senderId, candidate) {
        this.publisher
            ? this.publisher.addIceCandidate(candidate)
            : this.candidates[senderId].push({ candidate: candidate });
    }

    leaveRoom() {
        this.notifyOthers('participantLeft', this.id);
        this.releaseEndpoints();
        roomManager.unregisterParticipant(this.id, this.roomName);
    }

    register(name) {
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

    chatAll(message) {
        this.notifyOthers('newMessage', { message, from: this.name });
    }

    notifyClient(notification, data) {
        this.socket.emit(notification, data);
    }

    notifyOthers(notification, data) {
      this.socket.to(this.roomName).emit(notification, data);
    }


    getCandidates(id) {
        return this.candidates[id] || null;
    }

    getSubscriber(id) {
        return this.subscribers[id] || null;
    }
}
