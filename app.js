"use strict";

// App for YIO remote.
// https://github.com/martonborzak/yio-remote/wiki/Homey-integration

const Homey = require("homey");
const { HomeyAPI } = require("athom-api");
const WebSocket = require("ws");
const colorConvert = require("./colorconversions");
const homeyEvents = require("./homey_events");
const serviceMDNS = require("./service_mdns");

const API_SERVICE_PORT = 8936;
const API_SERVICE_NAME = "yio2homeyapi";
const MESSAGE_CONNECTED = '{"type":"connected"}';
const MESSAGE_GETCONFIG = '{"type": "command","command": "get_config"}';

let connectionManager = {};

class YioApp extends Homey.App {
  getApi() {
    if (!this.api) {
      this.api = HomeyAPI.forCurrentHomey();
    }
    return this.api;
  }

  // Start API Service.
  async startYioApiService() {
    const ApiService = new WebSocket.Server({ port: API_SERVICE_PORT });
    ApiService.on("connection", connection => {
      homeyEvents.startSubscribe();
      console.log("=======> ApiService incomming connection");

      connection.on("message", message => {
        this.messageHandler(connection, message);
      });

      connection.on("close", (reasonCode, description) => {
        console.log("(`=======X YIO left the building");
        connection = null;
      });

      connection.send(MESSAGE_CONNECTED);
      connection.send(MESSAGE_GETCONFIG);
    });
  }

  // handles incomming API messages
  async messageHandler(connection, message) {
    try {
      let jsonMessage = JSON.parse(message);
      if (jsonMessage.type && jsonMessage.type == "sendConfig") {
        for (let deviceId of jsonMessage.devices) {
          console.log(`=======> MESSAGE Requesting data for deviceId:  ${deviceId}`);
          this.handleGetDeviceState(connection, deviceId);
        }
      } else if (jsonMessage.type && jsonMessage.type == "command") {
        console.log(`=======> Received command: ${message}`);
        this.commandDeviceState(jsonMessage.deviceId, jsonMessage.command, jsonMessage.value);
      }
    } catch (e) {
      console.log(`ERROR: ${e}`);
    }
  }

  //Commanding device states.
  async commandDeviceState(deviceId, command, value) {
    let device = await this.api.devices.getDevice({ id: deviceId });
    if (command == "toggle") {
      command = "onoff";
      value = !device.capabilitiesObj.onoff.value;
    }
    if (command == "color") {
      let c = colorConvert.rgbToHsv(value[0], value[1], value[2]);
      this.setCapabilityValue(device, "light_hue", c[0]);
      this.setCapabilityValue(device, "light_saturation", c[1]);
      this.setCapabilityValue(device, "dim", c[2]);
    } else {
      this.setCapabilityValue(device, command, value);
    }
  }

  setCapabilityValue(device, command, value) {
    console.log(`>=>=>=>= Changing ${command} state of ${device.name} to ${value}`);
    device
      .setCapabilityValue(command, value)
      .then(r => {
        //
      })
      .catch(e => {
        //
      });
  }

  //On starting a connection YIO requests all devices added to the intergration plugin.
  //This function responds with with the state of the devices and subscribes to state events.
  async handleGetDeviceState(connection, deviceId) {
    let device = await this.api.devices.getDevice({ id: deviceId });

    let responseObject = {
      type: "sendStates",
      data: {
        entity_id: deviceId
      }
    };

    if (device.capabilitiesObj.onoff) {
      responseObject.data.onoff = device.capabilitiesObj.onoff.value;
    }
    if (device.capabilitiesObj.dim) {
      responseObject.data.dim = device.capabilitiesObj.dim.value;
    }
    if (device.capabilitiesObj.light_hue && device.capabilitiesObj.light_saturation && device.capabilitiesObj.dim) {
      responseObject.data.color = colorConvert.hsvToRgb(device.capabilitiesObj.light_hue.value, device.capabilitiesObj.light_saturation.value, device.capabilitiesObj.dim.value);
    }

    homeyEvents.addDevice(connection, device);

    let response = JSON.stringify(responseObject);
    connection.send(response);
    console.log(`<======= Send message: ${response}`);
  }

  //convert states
  convHomeyYioOnOff(device) {
    if (device.capabilitiesObj.onoff.value) {
      return "on";
    } else {
      return "off";
    }
  }

  // On app init
  async onInit() {
    console.log("starting server");

    this.api = await this.getApi();
    serviceMDNS.start(API_SERVICE_NAME, API_SERVICE_PORT);
    this.startYioApiService();

    //List all devices for easy adding to yio config.json
    let homeyDevicesAll = await this.api.devices.getDevices();
    console.log("");
    console.log("==== HOMEY DEVICE UUID LIST ====");
    this.displayHomeyDeviceInYioFormat(homeyDevicesAll);
    console.log("================================");
    console.log("");
  }

  displayHomeyDeviceInYioFormat(homeyDevicesAll) {
    let areas = [];
    //Print all devices
    for (let i in homeyDevicesAll) {
      const device = homeyDevicesAll[i];
      if (!areas.includes(device.zoneName)) areas.push(device.zoneName);

      if (device && device.class && device.class == "light") {
        let deviceYjson = this.ConversionLightDeviceHtoY(device);
        deviceYjson = JSON.stringify(deviceYjson);
        console.log(deviceYjson);
        console.log(",");
      }

      if (device && device.class && device.class == "speaker") {
        //let deviceYjson = this.ConversionLightDeviceHtoY(device);
        //deviceYjson = JSON.stringify(deviceYjson);
        //console.log(deviceYjson);
        //console.log(",");
      }
    }
    //Print all areas
    for (let area of areas) {
      console.log(`{"area": "${area}", "bluetooth": "xx:xx:xx:xx:xx"},`);
    }
  }

  //Converts a homey device object to a yio device object.
  ConversionLightDeviceHtoY(device) {
    let deviceYio = {
      area: device.zoneName,
      attributes: {
        brightness: 0,
        state: "off"
      },
      entity_id: device.id, //78f3ab16-c622-4bd7-aebf-3ca981e41375
      favorite: false,
      friendly_name: device.name,
      integration: "homey",
      supported_features: [], //"BRIGHTNESS", "COLOR", "COLORTEMP"
      type: "light"
    };
    if (device.capabilitiesObj.dim) deviceYio.supported_features.push("BRIGHTNESS");
    if (device.capabilitiesObj.light_temperature) deviceYio.supported_features.push("COLORTEMP");
    if (device.capabilitiesObj.light_hue) deviceYio.supported_features.push("COLOR");

    return deviceYio;
  }
}

module.exports = YioApp;
