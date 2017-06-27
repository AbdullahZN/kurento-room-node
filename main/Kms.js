const kurentoClient = require('kurento-client');

const MAX_BANDWITH = 300;
const MIN_BANDWITH = 300;

module.exports = class Kms {
  constructor(kmsUri) {
    this.kurento = kurentoClient(kmsUri);
    this.pipelines = { /* name : pipeline */ };
    this.Ice = kurentoClient.getComplexType('IceCandidate');
  }

  newWebRtcEndpoint(name) {
    return this.pipelines[name].create('WebRtcEndpoint').then(endpoint => {
      endpoint.setMaxVideoSendBandwidth(MAX_BANDWITH);
      endpoint.setMinVideoSendBandwidth(MIN_BANDWITH);
      return endpoint;
    });
  }

  newPipeline(name) {
    return this.kurento.create('MediaPipeline')
      .then(pipeline => { this.pipelines[name] = pipeline });
  }

  getPipeline(name) {
    return this.pipelines[name] || null;
  }

};
