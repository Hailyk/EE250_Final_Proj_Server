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
    // Increase the target temperature
    increaseTemperature() {
      this.indoor.targetTemperature++;
      this.updateTemperature(this.indoor.targetTemperature);
    },
    // Decrease the target temperature
    decreaseTemperature() {
      this.indoor.targetTemperature--;
      this.updateTemperature(this.indoor.targetTemperature);
    },
    // Fetch the temperature data from the server
    async fetchTemperature() {
      console.log('Fetching temperature data');
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
    // Update the target temperature to the server
    async updateTemperature(temperature) {
      console.log('Updating temperature to server');
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
    // fetch the temperature on load on web page
    this.fetchTemperature();

    // refresh the temperature every 5 seconds
    setInterval(this.fetchTemperature, 5000);
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
