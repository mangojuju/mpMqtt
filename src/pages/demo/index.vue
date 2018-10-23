<template>
  <div class="container">demo</div>
</template>

<script>
import mqtt from '../../utils/mqtt.js'

export default {
  data () {
    return {
      topic: ''
    }
  },

  methods: {
    afterReceived (msg) {
      console.log('收到数据啦', msg)
    }
  },
  async onLoad () {
    await mqtt.init()
    await mqtt.subscribe(this.topic, 1)
    mqtt.setOnMessageArrived(this.topic, function (msg) {
      this.afterReceived(msg)
    }, this)
  }
}
</script>

<style scoped>
  .container {
    display: flex;
  }
</style>
