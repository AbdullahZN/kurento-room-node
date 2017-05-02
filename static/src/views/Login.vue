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
            kurento: this.$store.state.kurento
        };
    },

    methods: {
        joinRoom() {
            this.kurento.start(this.userName, this.roomName);
            this.$store.commit('VIEW', 'chat');
        },
    },

};
</script>
