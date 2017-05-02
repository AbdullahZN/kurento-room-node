import * as kurentoRoom from '@/kurentoRoom';
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const state = {
  view: 'login',
  kurento: kurentoRoom,
};

const mutations = {
    VIEW: (state, view) => (state.view = view),
};

export default new Vuex.Store({
  strict: true,
  state,
  mutations
});
