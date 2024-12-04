# EE250 Final Project: Smart Thermostat
## Team Members
- [Haily Kuang](https://github.com/Hailyk)
- [Blake Courtney](https://github.com/blakecourtney)

## Project Repository
 [https://github.com/Hailyk/EE250_Final_Proj_Server](https://github.com/Hailyk/EE250_Final_Proj_Server)

## Compile instructions
### Server
1. `install node.js`
2. `cd server`
3. `npm install`
4. set the environmental variable `FREE_WEATHER_API_KEY` with api key from [WeatherAPI](https://www.weatherapi.com/)
4. `npm run start`

   running the npm start script compiles the front end at the same time. To run the server without compiling the front end, use `npm run quickstart`

### Raspberry Pi
1. `install python3`
2. setup the raspberry pi grove environment:
`curl -kL https://raw.githubusercontent.com/Hailyk/EE250-GrovePi/main/setup_grovepi.sh | bash`
3. clone repository
4. copy files in rpi folder into ee250 folder in Dexter Industries directory
5. install required python packages:
   - `pip install paho-mqtt`
   - `pip install RPi.GPIO` 
6. change the server address in rpi_pub_sub_sensors.py to the address of the server
7. `python rpi_pub_sub_sensors.py`

## External Libraries
### Server/client
- [Vue.js](https://vuejs.org/) Reactivity and front end framework
- [Aedes](https://github.com/moscajs/aedes/tree/main) Barebone MQTT broker
- [Express.js](https://expressjs.com/) Web server framework

### Raspberry Pi
- [Dexter Industries GrovePi](https://github.com/DexterInd/GrovePi) GrovePi library
- [Paho MQTT](https://pypi.org/project/paho-mqtt/) MQTT client library
- [RPi.GPIO](https://pypi.org/project/RPi.GPIO/) GPIO library for Raspberry Pi

