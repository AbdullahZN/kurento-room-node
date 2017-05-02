<template>
  <component :is='$store.state.view'></component>
</template>

<script>
import Chat from '@/views/Chat';
import Login from '@/views/Login';

export default {

  name: 'app',

  components: {
    login : Login,
    chat : Chat,
  },

};
</script>
