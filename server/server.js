const tls = require('tls');
const express = require('express');
const path = require('path')
const aedes = require('aedes')();
const request = require('request');
const https = require('https');
const fs = require('fs');

const WebApp = express();
const httpsPort = 3000;
const mqttPort = 8883;

// API Key for freeWeatherAPI
const apiKey = process.env.FREE_WEATHER_API_KEY;

// load the SSL certificate
const credentials = {
    key: fs.readFileSync(path.join(__dirname, 'certificates', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certificates', 'server.cert'))
};

const MqttServer = tls.createServer(credentials, aedes.handle);

WebApp.use(express.json());

let thermostatData = {
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

// ----------------- web server -----------------

// middleware used for logging the HTTP requests
WebApp.use((req,res,next)=>{
    const requestTime = new Date().toISOString();
    const requestIP = req.ip;
    const requestMethod = req.method.padEnd(6);
    const requestURL = req.originalUrl;
    console.log(`${requestTime}: ${requestIP} ${requestMethod}, ${requestURL}`);
    next();
});

// handle the GET request for the temperature
WebApp.get('/api/temperature', (req, res) => {
    res.status(200).json(thermostatData);
});

// handle the POST request to update the target temperature
WebApp.post('/api/temperature', (req, res) => {
    thermostatData.indoor.targetTemperature = req.body.targetTemperature;
    res.status(200).json(thermostatData);
});

// handle the get request the the webpage
WebApp.get('/index.html', (req,res)=>{
    res.sendFile(path.join(__dirname, '../client/dist/', 'index.html'));
});

// serves the static files under the dist folder in client folder
WebApp.use(express.static(path.join(__dirname, '../client/dist/')));

// -------------------end of web server -------------------

// ------------------- MQTT server -------------------

// handle the MQTT publish message
aedes.on('publish', (packet, client) => {
    if (packet.topic === 'thermostat/indoor/targetTemperature') {
        thermostatData.indoor.targetTemperature = parseInt(packet.payload.toString());
    }
    else if(packet.topic === 'thermostat/indoor/currentTemperature'){
        thermostatData.indoor.currentTemperature = parseInt(packet.payload.toString());
    }
    else if(packet.topic === 'thermostat/indoor/currentHumidity'){
        thermostatData.indoor.currentHumidity = parseInt(packet.payload.toString());
    }
    else if(/\/heartbeat$/.test(packet.topic)){
        console.log(`Heartbeat packet ${packet.topic}`);
    }
});

// handle the MQTT subscribe message
aedes.on('subscribe', (subscriptions, client) => {
    console.log(`MQTT client ${client.id} subscribed to topics: ${subscriptions.map(s => s.topic).join(', ')}`);
});

// handle the MQTT client connection
aedes.on('client', (client) => {
    console.log(`Client ${client.id} connected`);
});

// handle the MQTT client disconnection
aedes.on('clientDisconnect', (client) => {
    console.log(`Client ${client.id} disconnected`);
});

// get outdoor temperature and humidity
setInterval(() => {
    request(`http://api.weatherapi.com/v1/current.json?key=${apiKey}&q=\"los angeles\"`, (error, response, body) => {
        if (error) {
            console.log(error);
        }
        else {
            weatherData = JSON.parse(body);
            thermostatData.outdoor.currentTemperature = weatherData.current.temp_c;
            thermostatData.outdoor.currentHumidity = weatherData.current.humidity;
        }
    });
    aedes.publish({ topic: 'thermostat/outdoor/currentTemperature', payload: thermostatData.outdoor.currentTemperature.toString() });
    aedes.publish({ topic: 'thermostat/outdoor/currentHumidity', payload: thermostatData.outdoor.currentHumidity.toString() });
}, 600000);

// ------------------- end of MQTT server -------------------

// start the web server to listen on specific port
https.createServer(credentials, WebApp).listen(httpsPort, () => {
    console.log(`Web server running at https://localhost:${https}`);
});

// start the MQTT server to listen on specific port
MqttServer.listen(mqttPort, () => {
    if(!apiKey){
        throw new Error('Please provide the API key for freeWeatherAPI');
    }

    request("https://api.weatherapi.com/v1/current.json?key="+apiKey+"&q=los angeles&aqi=yes", (error, response, body) => {
        if (error) {
            console.log(error);
        }
        else {
            weatherData = JSON.parse(body);
            console.log("current temperature: " + weatherData.current.temp_c);
            console.log("current humidity: " + weatherData.current.humidity);
            thermostatData.outdoor.currentTemperature = weatherData.current.temp_c;
            thermostatData.outdoor.currentHumidity = weatherData.current.humidity;
        }
    });
    console.log(`MQTT server running at mqtt://localhost:${mqttPort}`);
});


