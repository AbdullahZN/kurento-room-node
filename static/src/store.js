import * as kurentoRoom from '@/kurentoRoom';
import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const state = {
  route: { name: 'login' },
  kurento: kurentoRoom,
};

const mutations = {
    ROUTE_TO: (state, route) => { state.route = route },
};

export default new Vuex.Store({
  strict: true,
  state,
  mutations
});
