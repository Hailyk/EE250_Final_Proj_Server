<template>
  <div id="app">
    <ThermostatDashboard />
  </div>
</template>

<script>
// For Debugging
import { devtools } from '@vue/devtools'
if (process.env.NODE_ENV === 'development')
  devtools.connect("http://127.0.0.1:8098")


import ThermostatDashboard from "@/components/ThermostatDashboard.vue";


export default {
  name: 'App',
  components: {
    ThermostatDashboard,
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
