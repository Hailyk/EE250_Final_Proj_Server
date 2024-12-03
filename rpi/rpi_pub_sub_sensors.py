import os
import ssl
import sys
import smbus
import RPi.GPIO as GPIO
import grovepi
from grove_rgb_lcd import *
import paho.mqtt.client as mqtt
import time
import json
# By appending the folder of all the GrovePi libraries to the system path here,
# we are successfully `import grovepi`
sys.path.append('~/Software/Python/')
sys.path.append('~/Software/Python/grove_rgb_lcd')

# obtain environment variables or default
HOST=os.environ.get("MQTT_SERVER", "192.168.14.46")
PORT=int(os.environ.get("MQTT_PORT", 1883))

# define the constants and global variables
tempsensor = 4
blue = 0
line = ""
target_temperature = 20 # default temp will be changed once a call server is established

# Load SSL/TLS CA
ca_cert = "/home/pi/Deploy/ee250/certificates/ca.cert"

print("Current working directory is: "+os.getcwd())

print("server:"+ HOST)
print("port:"+ str(PORT))


def init_lcd():
    setRGB(200, 200,200)
    setText("               \n               ")

def handle_target(client, userdata, msg):
    global target_temperature
    target_temperature = msg.payload.decode("UTF-8", 'strict')
    target_temperature = json.loads(target_temperature)["targetTemperature"]
    print("New target temperature: ", target_temperature)

def handle_hum(client, userdata, msg):
    hum_state = msg.payload.decode("UTF-8", 'strict')
    # Get the Ultrasonic Ranger value
    print(hum_state)
    #setText(hum_state)

def on_connect(client, userdata, flags, rc):
    print("Connected to server (i.e., broker) with result code "+str(rc))

    # subscribe to the relevant topics
    client.subscribe("thermostat/indoor/currentTemperature")
    client.subscribe("thermostat/indoor/currentHumidity")
    client.subscribe("thermostat/indoor/targetTemperature")

    # add callback functions
    client.message_callback_add("thermostat/indoor/currentTemperature", handle_temp)
    client.message_callback_add("thermostat/indoor/currentHumidity", handle_hum)
    client.message_callback_add("thermostat/indoor/targetTemperature", handle_target)
    
#Default message callback to catch all other mqtt messages.
def on_message(client, userdata, msg):
    print("on_message: " + msg.topic + " " + str(msg.payload, "utf-8"))

# getter for the temperature and humidity
def get_dht(tempsensor):
    # Get the temp and hum value
    return grovepi.dht(tempsensor,blue)


if __name__ == '__main__':

    #this section is covered in publisher_and_subscriber_example.py
    client = mqtt.Client()

    #enable ssl/tls
    client.tls_set(cert_reqs=ssl.CERT_NONE, tls_version=ssl.PROTOCOL_TLSv1_2)
    client.tls_insecure_set(True) # allow insecure certificates for testing

    # define mqtt message and connection handler
    client.on_message = on_message
    client.on_connect = on_connect

    # initialize the lcd
    init_lcd()

    # connect and start mqtt service
    client.connect(host=HOST, port=PORT, keepalive=120)
    client.loop_start()

    # sleep to allow for sensor to get init value
    time.sleep(5)

    # send a request for the target temperature
    client.publish("thermostat/indoor/getTargetTemperature", "")

    while True:
        # get the temperature and humidity
        [temp,humidity] = get_dht(tempsensor)

        # check if ac or heat is needed
        if temp > target_temperature:
            control = 1
        elif temp < target_temperature:
            control = -1
        else:
            control = 0

        # print to the lcd screen
        print("temperature=%.01fC humidity=%.02f%%"%(temp, humidity))
        print("target temperature: "+str(target_temperature))
        print("control: "+str(control))
        line = "t=%.01fC Con=%i \nh=%.01f%%"%(temp, control, humidity)
        setText_norefresh(line)

        # publish the sensor data to server
        client.publish("thermostat/indoor/currentTemperature", "{\"currentTemperature\": \""+str(temp)+"\"}")
        client.publish("thermostat/indoor/currentHumidity", "{\"currentHumidity\": \""+str(humidity)+"\"}")

        time.sleep(10)