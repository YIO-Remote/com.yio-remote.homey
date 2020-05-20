"use strict";

const { ManagerImages } = require("homey");
const tools = require("./tools");

const SUPPORTED_EVENTS = ["onoff", "dim", "speaker_artist", "speaker_playing", "volume_set", "speaker_track"];
const SUBSCRIBE_INITIAL_AFTER = 5000; //milisec
const SUBSCRIBE_DELAY = 300; //milisec

let deviceListToBeSubscribed = [];
let subscriptionTimer;
let registeredEvents = {};

// Adds a device and the used connection to a queue so a listener can be build with a short delay in between.
function addDevice(connection, clientIp, device) {
  deviceListToBeSubscribed.push({
    connection,
    clientIp,
    device
  });
}
module.exports.addDevice = addDevice;

// This function starts a delayed process subscription.
function startSubscribe() {
  console.log(`[EVENTS] Subscriber started`);
  subscriptionTimer = setTimeout(slowsubscribe, SUBSCRIBE_INITIAL_AFTER);
}
module.exports.startSubscribe = startSubscribe;

// This function starts the subscribe function for 1 device at a time every x time.
function slowsubscribe() {
  if (deviceListToBeSubscribed.length > 0) {
    console.log(`[EVENTS] Subscribing: ${deviceListToBeSubscribed[0].clientIp} ${deviceListToBeSubscribed[0].device}`);
    subscribeToDeviceEvents(deviceListToBeSubscribed[0].connection, deviceListToBeSubscribed[0].clientIp, deviceListToBeSubscribed[0].device);
    deviceListToBeSubscribed.shift();
    setTimeout(slowsubscribe, SUBSCRIBE_DELAY);
  }
}

// This function subscribes to state events and handles the update handling to YIO.
function subscribeToDeviceEvents(connection, clientIp, device) {
  for (let i in device.capabilities) {
    if (SUPPORTED_EVENTS.includes(device.capabilities[i])) {
      console.log(`======== building listener for ${device.name}:${device.capabilities[i]}`);

      try {
        if (!registeredEvents[clientIp]) registeredEvents[clientIp] = {};
        const handle = `${device.id}_${device.capabilities[i]}`;
        if (!registeredEvents[clientIp][handle]) {
          registeredEvents[clientIp][handle] = device.makeCapabilityInstance(device.capabilities[i], value => {
            console.log(`=======> statechanged:"${device.capabilities[i]}" to:"${value}" on:"${device.name}".`);
            const capName = device.capabilities[i];
            if (capName == "speaker_track") {
              grabAlbumArt(connection, device);
            }
            const response = JSON.stringify({
              type: "event",
              data: {
                entity_id: device.id,
                [capName]: `${value}`
              }
            });
            console.log(`<======= Inform YIO: ${response}`);
            connection.send(response);
          });
        }
      } catch (e) {
        console.log(` ERROR!  Homey Events Error building listener for ${device.name}:${device.capabilities[i]}`);
      }
    }
  }
}

function grabAlbumArt(connection, device) {
  console.log("== IMAGE DEBUG ==");
  if (device && device.images[0] && device.images[0].imageObj && device.images[0].imageObj.url) {
    const url = `http://${tools.getLocalIp()}${device.images[0].imageObj.url}?${Date.now()}`;
    const response = JSON.stringify({
      type: "event",
      data: {
        entity_id: device.id,
        album_art: url
      }
    });
    connection.send(response);
  }
  console.log("== IMAGE DEBUG ==");
}
