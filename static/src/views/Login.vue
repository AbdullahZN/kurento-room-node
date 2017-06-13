<template>
    <div id="Login">
        <form>
            <label>userName</label>
            <input v-model='userName' type="text">
            <label>roomName</label>
            <input v-model='roomName' type="text">
            <button @click.prevent='joinRoom' v-if='userName && roomName'>Join</button>
        </form>
    </div>
</template>

<script>
export default {

    name: 'login',

    data() {
        return {
            userName: '',
            roomName: '',
        };
    },

    methods: {
        joinRoom() {
            this.$store.dispatch('start', { user: this.userName, room: this.roomName });
            this.$store.commit('updateView', 'chat');
        },
    },

};
</script>
