"use strict";

let _allHomeyDevices = false;
let _HomeyDevicesApi = false;

module.exports.registerHomeyDevicesApi = function(devicesApi) {
  _HomeyDevicesApi = devicesApi;
  console.log(`YIOConfigurationHelper loaded`);
};

module.exports.buildHomeyEntitities = async function() {
  _allHomeyDevices = await _HomeyDevicesApi.getDevices();
  let payload = { type: "sendEntities", available_entities: [] };

  for (let i in _allHomeyDevices) {
    const device = _allHomeyDevices[i];

    if (device && device.class && device.class == "light") {
      payload.available_entities.push(ConversionLightDeviceHtoY(device));
    }

    if (device && device.class && device.class == "speaker") {
      payload.available_entities.push(ConversionMediaDeviceHtoY(device));
    }
  }
  let payloadJson = JSON.stringify(payload);
  return payloadJson;
};

//Converts a homey device object to a yio device object.
function ConversionLightDeviceHtoY(device) {
  let deviceYio = {
    type: "light",
    entity_id: device.id,
    friendly_name: device.name,
    supported_features: []
  };
  if (device.capabilitiesObj.dim) deviceYio.supported_features.push("BRIGHTNESS");
  if (device.capabilitiesObj.light_temperature) deviceYio.supported_features.push("COLORTEMP");
  if (device.capabilitiesObj.light_hue) deviceYio.supported_features.push("COLOR");

  return deviceYio;
}

//Converts a homey device object to a yio device object.
function ConversionMediaDeviceHtoY(device) {
  let deviceYio = {
    type: "media_player",
    entity_id: device.id,
    friendly_name: device.name,
    supported_features: ["SOURCE", "APP_NAME", "VOLUME", "VOLUME_UP", "VOLUME_DOWN", "VOLUME_SET", "MUTE", "MUTE_SET", "MEDIA_TYPE", "MEDIA_TITLE", "MEDIA_ARTIST", "MEDIA_ALBUM", "MEDIA_DURATION", "MEDIA_POSITION", "MEDIA_IMAGE", "PLAY", "PAUSE", "STOP", "PREVIOUS", "NEXT", "SEEK", "SHUFFLE", "TURN_ON", "TURN_OFF"]
  };
  return deviceYio;
}
