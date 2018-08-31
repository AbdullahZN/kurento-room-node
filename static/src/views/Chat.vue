<template>
  <div id="video-list">
    <template v-for="participant in $store.state.participants">
      <kms-video
        :key="participant.id"
        :srcObject="participant.src"
      >
      </kms-video>
    </template>
  </div>
</template>

<script>

const data = {};

import Video from '@/views/Video';

export default {

  name: 'chat',

  components: {
    'kms-video': Video,
  },

  data: () => data,

}
</script>
