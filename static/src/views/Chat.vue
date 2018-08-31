<template>
  <div id="video-list">
    <template v-for="participant in $store.state.participants">
      <video :key="participant.id" autoplay :src="participant.src"></video>
    </template>
  </div>
</template>

<script>

const data = {};

export default {

  name: 'chat',

  data: () => data,

}
</script>
