<template>
  <component :is='$store.state.route.name'></component>
</template>

<script>
import Chat from '@/components/Chat';
import Login from '@/components/Login';

export default {

  name: 'app',

  components: {
    login : Login,
    chat : Chat,
  },

};
</script>
