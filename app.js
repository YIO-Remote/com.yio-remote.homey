"use strict";

// App for YIO remote.
// https://yio-remote.com

const Homey = require("homey");
const { HomeyAPI } = require("athom-api");
const WebSocket = require("ws");
const colorConvert = require("./colorconversions");
const homeyEvents = require("./homey_events");
const serviceMDNS = require("./service_mdns");
const yioConfigurationHelper = require("./yioConfigurationHelper");
const tools = require("./tools");

const API_SERVICE_PORT = 8936;
const API_SERVICE_NAME = "yio2homeyapi";
const MESSAGE_CONNECTED = '{"type":"connected"}';
const MESSAGE_GETENTITIES = '{"type":"command","command":"getEntities"}';

class YioApp extends Homey.App {
  getApi() {
    if (!this.api) {
      this.api = HomeyAPI.forCurrentHomey();
    }
    return this.api;
  }

  // Start API Service.
  async startYioApiService() {
    const ApiService = new WebSocket.Server({
      port: API_SERVICE_PORT
    });

    ApiService.on("connection", (connection, req) => {
      let clientIp = tools.getClientIp(req.connection.remoteAddress);

      homeyEvents.startSubscribe();

      console.log(`[PLUGIN] incomming connection from ${clientIp}`);

      connection.on("message", message => {
        console.log(`[PLUGIN]: ${message}`);
        this.messageHandler(connection, clientIp, message);
      });

      connection.on("close", () => {
        console.log("[PLUGIN] YIO left the building.");
        connection = null;
      });

      connection.on("error", () => {
        console.log("[PLUGIN] YIO left the building in a hurry.");
        connection = null;
      });

      // delay the communications to make sure all is good before comms.
      setTimeout(this.pluginInit, 1500, connection);
    });
  }

  async pluginInit(connection) {
    // Tell the plugin that the APP and Plugin are connected
    console.log(`[APP]: ${MESSAGE_CONNECTED}`);
    connection.send(MESSAGE_CONNECTED);

    // Inform the Plugin about the available entities
    let payload = await yioConfigurationHelper.buildHomeyEntitities();
    console.log(`[APP]: ${payload}`);
    connection.send(payload);

    // Ask the plugin about the actually used entities
    console.log(`[APP]: ${MESSAGE_GETENTITIES}`);
    connection.send(MESSAGE_GETENTITIES);
  }

  // handles incomming API messages
  async messageHandler(connection, clientIp, message) {
    try {
      let jsonMessage = JSON.parse(message);

      //Yio req config
      if (jsonMessage.type && jsonMessage.type == "getEntities") {
        for (let deviceId of jsonMessage.devices) {
          console.log(`[PLUGIN] Requesting data for deviceId:  ${deviceId}`);
          this.handleGetDeviceState(connection, clientIp, deviceId);
        }

        // if a command is received
      } else if (jsonMessage.type && jsonMessage.type == "command") {
        console.log(`[PLUGIN] command: ${message}`);
        this.commandDeviceState(jsonMessage.deviceId, jsonMessage.command, jsonMessage.value);

        // Respond with all devices
      }
    } catch (e) {
      console.log(`ERROR: ${e}`);
    }
  }

  //Commanding device states.
  async commandDeviceState(deviceId, command, value) {
    let device = await this.api.devices.getDevice({
      id: deviceId
    });
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
  async handleGetDeviceState(connection, clientIp, deviceId) {
    let device = await this.api.devices.getDevice({
      id: deviceId
    });

    let responseObject = {
      type: "sendStates",
      data: {
        entity_id: deviceId
      }
    };

    if (device.capabilitiesObj.onoff) {
      responseObject.data.onoff = `${device.capabilitiesObj.onoff.value}`;
    }
    if (device.capabilitiesObj.dim) {
      responseObject.data.dim = `${device.capabilitiesObj.dim.value}`;
    }
    if (device.capabilitiesObj.light_hue && device.capabilitiesObj.light_saturation && device.capabilitiesObj.dim) {
      responseObject.data.color = colorConvert.hsvToRgb(device.capabilitiesObj.light_hue.value, device.capabilitiesObj.light_saturation.value, device.capabilitiesObj.dim.value);
    }

    homeyEvents.addDevice(connection, clientIp, device);

    let response = JSON.stringify(responseObject);
    connection.send(response);
    console.log(`<======= Send message: ${response}`);
  }

  // On app init
  async onInit() {
    console.log("starting server");

    this.api = await this.getApi();
    serviceMDNS.start(API_SERVICE_NAME, API_SERVICE_PORT);
    this.startYioApiService();

    //List all devices for easy adding to yio config.json
    yioConfigurationHelper.registerHomeyDevicesApi(this.api.devices);

    console.log(Homey);
  }
}

module.exports = YioApp;
