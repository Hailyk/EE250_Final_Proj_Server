const tls = require('tls');
const express = require('express');
const path = require('path')
const aedes = require('aedes')();
const https = require('https');
const fs = require('fs');

const WebApp = express();
const httpsPort = 3000;
const mqttPort = 1883;

const decoder = new TextDecoder('utf-8');

// API Key for freeWeatherAPI
const apiKey = process.env.FREE_WEATHER_API_KEY;

// load the SSL certificate
const credentials = {
    key: fs.readFileSync(path.join(__dirname, 'certificates', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certificates', 'server.cert'))
};

//creates the encrypted MQTT server
const MqttServer = tls.createServer(credentials, aedes.handle);

// middleware used for parsing the JSON data
WebApp.use(express.json());

// stores the data
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
    console.log('GET /api/temperature');
    res.status(200).json(thermostatData);
});

// handle the POST request to update the target temperature
WebApp.post('/api/temperature', (req, res) => {
    thermostatData.indoor.targetTemperature = req.body.targetTemperature;

    // builds the payload
    let payload = {targetTemperature: thermostatData.indoor.targetTemperature};
    const sharedBuffer = Buffer.from(JSON.stringify(payload));

    // publish the message to the MQTT server
    aedes.publish({ topic: 'thermostat/indoor/targetTemperature', payload: sharedBuffer }, (err) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error updating target temperature');
        }
        else {
            console.log(`Updating target temperature to ${thermostatData.indoor.targetTemperature}`);
            res.status(200).json(thermostatData);
        }
    });
});

// handle the get request the the webpage
WebApp.get('/index.html', (req,res)=>{
    res.sendFile(path.join(__dirname, '../client/dist/', 'index.html'));
});

// handle the get request to the root url same as index.html
WebApp.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname, '../client/dist/', 'index.html'));
});

// serves the static files under the dist folder in client folder
WebApp.use(express.static(path.join(__dirname, '../client/dist/')));

// -------------------end of web server -------------------

// ------------------- MQTT server -------------------

// handle the MQTT publish message
aedes.on('publish', (packet, client) => {
    // handle the case where the client is not defined
    if(client == null || client.id == null){
        client = { id: 'unknown' };
    }

    // handles the push of data to the target temperature
    if (packet.topic === 'thermostat/indoor/targetTemperature') {
        let decodedPayload = decoder.decode(packet.payload);
        thermostatData.indoor.targetTemperature = parseInt(JSON.parse(decodedPayload).targetTemperature);
        console.log(`Updating target temperature to ${thermostatData.indoor.targetTemperature}`);

    }
    else if(packet.topic === 'thermostat/indoor/getTargetTemperature'){
        // builds the payload
        let payload = {targetTemperature: thermostatData.indoor.targetTemperature};
        const sharedBuffer = Buffer.from(JSON.stringify(payload));

        // publish the message
        aedes.publish({ topic: 'thermostat/indoor/targetTemperature', payload: sharedBuffer }, (err) => {
            if (err) {
                console.log(err);
            }
            else {
                console.log(`Updating target temperature to ${thermostatData.indoor.targetTemperature}`);
            }
        });
    }
    // handles the push of data to the current temperature
    else if(packet.topic === 'thermostat/indoor/currentTemperature'){
        let decodedPayload = decoder.decode(packet.payload);
        thermostatData.indoor.currentTemperature = parseInt(JSON.parse(decodedPayload).currentTemperature);
        console.log(`Updating current temperature to ${thermostatData.indoor.currentTemperature}`);
    }
    // handles the push of data to the current humidity
    else if(packet.topic === 'thermostat/indoor/currentHumidity'){
        let decodedPayload = decoder.decode(packet.payload);
        thermostatData.indoor.currentHumidity = parseInt(JSON.parse(decodedPayload).currentHumidity);
        console.log(`Updating current humidity to ${thermostatData.indoor.currentHumidity}`);
    }
    // handles mqtt heartbeat packet
    else if(/\/heartbeat$/.test(packet.topic)){
        console.log(`Heartbeat packet ${packet.topic}`);
    }
    // logs when a new client connects
    else if(/\$SYS\/[a-f0-9-]+\/(new\/clients)/.test(packet.topic)){
        console.log(`New client connected`);
    }
    // catches all other messages
    else {
        console.log(`MQTT client ${client.id} published message: ${packet.payload.toString()} to topic: ${packet.topic}`);
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

aedes.on('reconnect', (client) => {
    console.log(`Client ${client.id} reconnected`);
});

// handle the MQTT client disconnection
aedes.on('clientDisconnect', (client) => {
    console.log(`Client ${client.id} disconnected`);
});

// get outdoor temperature and humidity
setInterval(() => {

    // sends a request to the weather API
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
    console.log(`Publishing outdoor temperature and humidity: ${thermostatData.outdoor.currentTemperature}, ${thermostatData.outdoor.currentHumidity}`);
}, 6000000);

// ------------------- end of MQTT server -------------------

// start the web server to listen on specific port
https.createServer(credentials, WebApp).listen(httpsPort, () => {
    console.log(`Web server running at https://localhost:${httpsPort}`);
});

// start the MQTT server to listen on specific port
MqttServer.listen(mqttPort, () => {
    if(!apiKey){
        throw new Error('Please provide the API key for freeWeatherAPI');
    }

    // sends a request to the weather API on start of server
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
    console.log(`MQTT server running at mqtts://localhost:${mqttPort}`);
});


