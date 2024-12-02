<!-- src/components/ThermostatDashboard.vue -->
<template>
  <div class="thermostat-dashboard">
    <h1>Thermostat Control</h1>
    <div class="temperature-display">
      <p>Outdoor Conditions: Temperature: {{outdoor.currentTemperature}}°C Humidity: {{outdoor.currentHumidity}}%</p>
    </div>
    <div class="temperature-display">
      <p>Current Room Temperature: {{indoor.currentTemperature }}°C Humidity: {{indoor.currentHumidity}}%</p>
    </div>
    <div class="controls">
      <button @click="decreaseTemperature">-</button>
      <span>{{ indoor.targetTemperature }}°C</span>
      <button @click="increaseTemperature">+</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ThermostatDashboard',
  data() {
    return {
      outdoor: {
        currentTemperature: 25,
        currentHumidity: 50
      },
      indoor: {
        currentTemperature: 20,
        targetTemperature: 20,
        currentHumidity: 40
      }
    };
  },
  methods: {
    increaseTemperature() {
      this.indoor.targetTemperature++;
      this.updateTemperature(this.indoor.targetTemperature);
    },
    decreaseTemperature() {
      this.indoor.targetTemperature--;
      this.updateTemperature(this.indoor.targetTemperature);
    },
    async fetchTemperature() {
      try{
        const response = await fetch('/api/temperature');
        const data = await response.json();
        this.outdoor = data.outdoor;
        this.indoor = data.indoor;
      }
      catch(error) {
        console.error('Error fetching data from server');
      }
    },
    async updateTemperature(temperature) {
      try {
        await fetch('/api/temperature', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            targetTemperature: temperature
          })
        });
      }
      catch(error){
        console.error('Error updating temperature to server');
      }
    }
  },
  mounted() {
    this.fetchTemperature();
  }
};
</script>

<style scoped>
.thermostat-dashboard {
  text-align: center;
}

.temperature-display {
  font-size: 30px;
  margin: 15px 0;
}

.controls {
  display: flex;
  justify-content: center;
  align-items: center;
}

.controls button {
  font-size: 30px;
  margin: 0 15px;
  padding: 10px;
}
</style>
