import * as kurentoRoom from '@/kurentoRoom';
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const state = {
  view: 'login',
  participants: {},
};

const mutations = {
    updateView: (state, view) => (state.view = view),

    addParticipant: (state, { id, src }) => {
        Vue.set(state.participants, id, { id, src });
    },

    removeParticipant(state, participantId) {
        Vue.delete(state.participants, participantId);
    },
};

const actions = {
  start(store, { user, room }) {
    kurentoRoom.start(user, room);
  }
}

const store = new Vuex.Store({ strict: true, state, mutations, actions });
const commit = store.commit;

kurentoRoom.on('registeredUser', user => commit('setUser', user));
kurentoRoom.on('newParticipant', participant => commit('addParticipant', participant));
kurentoRoom.on('participantLeft', id => commit('removeParticipant', id));

export default store;
