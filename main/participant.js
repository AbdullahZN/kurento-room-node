module.exports = class Participant {
    constructor(socket, roomManager) {
        this.socket = socket;
        this.roomManager = roomManager;
        this.kms = roomManager.kms;

        this.roomName = null;
        this.publisher = null;
        this.subscribers = {};
        this.candidates = {};

        this.state = {
            id: socket.id,
            name: null
        };

        socket
            .emit('id', { id: this.state.id })

        .on('error', () => this.leaveRoom())
            .on('leaveRoom', () => this.leaveRoom())
            .on('disconnect', () => this.leaveRoom())

        .on('chatAll', message => this.chatAll(message))
            .on('register', payload => this.register(payload))
            .on('joinRoom', roomName => this.joinRoom(roomName))
            .on('receiveVideo', payload => this.receiveVideo(payload))
            .on('onIceCandidate', payload => this.onIceCandidate(payload));
        console.log(`Received new client : ${this.state.id}`);
    }

    addCandidatesToEndpoint(senderId, endpoint) {
        this.getCandidates(senderId).forEach(({ candidate }) =>
            endpoint.addIceCandidate(candidate)
        );
        return this;
    }

    newSubscriberEndpoint(sender, pipeline) {
        const endpoint = pipeline.create('WebRtcEndpoint');
        endpoint.then((endpoint) => {
            console.log(`${this.id} > successfully created subscriber endpoint for ${sender.id}`);

            endpoint.setMaxVideoRecvBandwidth(300);
            endpoint.setMinVideoRecvBandwidth(300);

            this.subscribers[sender.id] = endpoint;

            this.candidates[sender.id] = this.candidates[sender.id] || [];
            this.candidates[sender.id].forEach(({ candidate }) => {
                endpoint.addIceCandidate(candidate);
            });

            endpoint.on('OnIceCandidate', (event) => {
                const candidate = this.roomManager.Ice(event.candidate);
                this.notifyClient('iceCandidate', { sessionId: sender.id, candidate: candidate });
            });
        });
        return endpoint;
    }


    addSubscriberEndpoint(senderId, endpoint) {
        this.subscribers[senderId] = endpoint;
        return this;
    }

    subscribeToIceCandidate(senderId, endpoint) {
        endpoint.on('OnIceCandidate', ({ candidate }) => {
            const ice = this.kms.Ice(candidate);
            this.notifyClient('iceCandidate', { senderId, candidate: ice });
        });
        return this;
    }

    initIceExchange(senderId, endpoint) {
        // methods needed in exchange process
        const steps = [
            'addSubscriberEndpoint',
            'addCandidatesToEndpoint',
            'subscribeToIceCandidate'
        ];
        steps.forEach(method => this[method](senderId, endpoint));
    }

    newSubscriber(senderId) {
        return this.kms.newWebRtcEndpoint(this.roomName);
    }

    connectToRemote(endpoint, senderEndpoint) {
        senderEndpoint.connect(endpoint);
        return endpoint;
    }

    getRemoteEndpoint(senderId) {
        const subscriber = (senderId === this.getId()) ?
            this.publisher :
            this.getSubscriber(senderId, true);

        return subscriber || this.newSubscriber(senderId);
    }

    receiveVideo({ senderId, sdpOffer }) {
        console.log(`${this.getId()} receive from ${senderId}`);

        const sender = this.roomManager.getParticipantById(senderId);
        if (!sender) return console.log(`participant ${senderId} is not in room`);

        this.getRemoteEndpoint(senderId).then(endpoint => {
            this.initIceExchange(senderId, endpoint);
            this.connectToRemote(endpoint, sender.publisher);
            endpoint.processOffer(sdpOffer).then(sdpAnswer =>
                this.notifyClient('gotAnswer', { senderId, sdpAnswer })
            );
        });

        console.log(`${this.getId()} answered to ${senderId}`);
    }

    addCandidate(senderId, candidate) {
        const subscriber = (senderId !== this.getId()) ?
            this.getSubscriber(senderId, true) :
            this.publisher;

        if (subscriber) {
            subscriber.addIceCandidate(candidate);
        }
        this.getCandidates(senderId).push({ candidate });
    }

    leaveRoom() {
        const pid = this.getId();
        this.notifyOthers('participantLeft', pid);
        this.releaseEndpoints();
        this.candidates = {};
        this.roomManager.unregisterParticipant(pid, this.roomName);
    }

    register(name) {
        const uid = this.getId();
        this.state.name = name;
        this.roomManager.registerParticipant(this);
        this.notifyClient('registered', `Successfully registered ${uid}`);
    }

    joinRoom(roomName) {
        const id = this.getId();

        this.roomName = roomName;
        this.roomManager.addParticipantToRoom(roomName, this).then(endpoint => {
            this.socket.join(roomName);
            this.setPublisher(endpoint)
                .addCandidatesToEndpoint(id, endpoint)
                .subscribeToIceCandidate(id, endpoint)
                .sendStateToRoom()
                .sendRoomStateToSelf(this.roomManager.participantsByRoom[roomName]);
        });
    }

    onIceCandidate({ senderId, candidate }) {
        const IceCandidate = this.kms.Ice(candidate);
        this.setCandidates(senderId);
        this.addCandidate(senderId, IceCandidate);
    }

    chatAll(message) {
        this.notifyRoom('newMessage', { message, from: this.name });
    }

    notifyClient(notification, data) {
        this.socket.emit(notification, data);
    }

    notifyOthers(notification, data) {
        this.socket.to(this.roomName).emit(notification, data);
    }

    notifyRoom() {
        this.notifyOthers(notification, data);
        this.notifyClient(notification, data);
    }

    releaseEndpoints() {
        this.publisher && this.publisher.release();
        Object.values(this.subscribers).forEach(endpoint => endpoint.release());
        this.publisher = null;
        this.subscribers = {};
    }

    sendStateToRoom() {
        this.notifyOthers('newParticipant', this.getState());
        return this;
    }

    sendRoomStateToSelf(roomParticipants) {
        this.notifyClient('existingParticipants', roomParticipants);
        return this;
    }

    getCandidates(id) {
        return this.candidates[id] || [];
    }

    setCandidates(id) {
        this.candidates[id] = this.candidates[id] || [];
    }

    setPublisher(endpoint) {
        this.publisher = endpoint;
        return this;
    }

    // can return null for boolean comparison
    getSubscriber(id, returnNull = false) {
        return this.subscribers[id] || (returnNull ? null : []);
    }

    getId() {
        return this.state.id;
    }

    getState() {
        return this.state;
    }

    getFromState(property) {
        if (!this.state[property])
            throw new Error(`Property ${property} not found in participant`);
        return this.state[property];
    }

    setState(obj) {
        Object.keys(obj)
            .filter(key => this.state.hasOwnProperty(key))
            .forEach(key => { this.state[key] = obj[key] });
    }
}