"use strict";
const tools = require("./tools");

let _allHomeyDevices = false;
let _HomeyDevicesApi = false;
let _configObj;
let _socket;

module.exports.registerAllHomeyDevices = function (allHomeyDevices) {
    _allHomeyDevices = allHomeyDevices;
}

module.exports.registerHomeyDevicesApi = function (devicesApi) {
    _HomeyDevicesApi = devicesApi
}

module.exports.addDevicesToYioConfig = function (clientIp) {
    wsConnect(`ws://${clientIp}:946`);
}


function wsConnect(url) {
    _socket = new WebSocket(url);
    console.log(`[API] Connecting to YIO configuration API: "${url}"`);

    _socket.onopen = function (e) {
        _socket.send('{"type":"auth","token": "0"}');
    };

    _socket.onmessage = function (event) {
        const messageJson = event.data;
        let messageObj = JSON.parse(messageJson);
        if (messageObj.type && messageObj.type === "auth_ok") {
            _socket.send('{"type":"getconfig"}');
        }
        if (messageObj.type && messageObj.type === "config") {
            _configObj = messageObj.config;
            updateYioConfiguration();
        }
    };

    _socket.onclose = function (event) {
        if (event.wasClean) {
            console.log("")
        } else {
            console.log("")
        }
    };

    _socket.onerror = function (error) {
        console.log(`[error] ${error.message}`);
    };
}

async function updateYioConfiguration() {
    _allHomeyDevices = await _HomeyDevicesApi.getDevices();
    let integrationId = getIntegrationId();
    let changeCount = 0;
    for (let i in _allHomeyDevices) {
        const device = _allHomeyDevices[i];

        if (device && device.class && device.class == "light") {
            if (isDeviceAddedToYio(device, "light") == false) {
                console.log(`[API] Adding homey device ${device.id} to YIO.`);
                let deviceYjson = ConversionLightDeviceHtoY(device, integrationId);
                _configObj.entities["light"].push(deviceYjson);
                changeCount++;
            }
        }

        if (device && device.class && device.class == "speaker") {
            if (isDeviceAddedToYio(device, "media_player") == false) {
                console.log(`[API] Adding homey device ${device.id} to YIO.`);
                let deviceYjson = ConversionMediaDeviceHtoY(device, integrationId);
                _configObj.entities["media_player"].push(deviceYjson);
                changeCount++;
            }
        }
    }
    if (changeCount > 0) saveConfig();
}

function saveConfig() {
    try {
        //Try parsing configuration. Fail on error
        let configJson = JSON.stringify(_configObj);
        _socket.send(`{"type":"setconfig", "config":${configJson}}`);
        console.log("[API] Config saved");
    } catch (e) {
        console.log(`[API] Failed to save configuration with error: ${e.message}`);
    }
}

function isDeviceAddedToYio(device, type) {
    let deviceId = device.id;
    let foundDevice = false;
    for (let i in _configObj.entities[type]) {
        let yioDevice = _configObj.entities[type][i];
        if (yioDevice.entity_id == deviceId) foundDevice = true;
    }
    return foundDevice;
}

//Converts a homey device object to a yio device object.
function ConversionLightDeviceHtoY(device, integrationId) {
    let deviceYio = {
        entity_id: device.id, //78f3ab16-c622-4bd7-aebf-3ca981e41375
        friendly_name: device.name,
        integration: integrationId,
        supported_features: [] //"BRIGHTNESS", "COLOR", "COLORTEMP"
    };
    if (device.capabilitiesObj.dim) deviceYio.supported_features.push("BRIGHTNESS");
    if (device.capabilitiesObj.light_temperature) deviceYio.supported_features.push("COLORTEMP");
    if (device.capabilitiesObj.light_hue) deviceYio.supported_features.push("COLOR");

    return deviceYio;
}

function ConversionMediaDeviceHtoY(device, integrationId) {
    let deviceYio = {
        entity_id: device.id, //78f3ab16-c622-4bd7-aebf-3ca981e41375
        friendly_name: device.name,
        integration: integrationId,
        supported_features: [
            "SOURCE",
            "APP_NAME",
            "VOLUME",
            "VOLUME_UP",
            "VOLUME_DOWN",
            "VOLUME_SET",
            "MUTE",
            "MUTE_SET",
            "MEDIA_TYPE",
            "MEDIA_TITLE",
            "MEDIA_ARTIST",
            "MEDIA_ALBUM",
            "MEDIA_DURATION",
            "MEDIA_POSITION",
            "MEDIA_IMAGE",
            "PLAY",
            "PAUSE",
            "STOP",
            "PREVIOUS",
            "NEXT",
            "SEEK",
            "SHUFFLE",
            "TURN_ON",
            "TURN_OFF"
        ]
    };
    //console.log("DEBUG =>>>>");
    //console.log(device.capabilitiesObj);

    return deviceYio;
}

function getIntegrationId() {
    let homeyIp = tools.getLocalIp();
    let integrationId;
    if (_configObj && _configObj.integrations && _configObj.integrations.homey && _configObj.integrations.homey.data) {
        for (let i in _configObj.integrations.homey.data) {
            const homeyIntegration = _configObj.integrations.homey.data[i];
            if (homeyIntegration.data && homeyIntegration.data.ip && homeyIntegration.data.ip == `${homeyIp}:8936`) {
                integrationId = homeyIntegration.id;
            }
        }
    }

    return integrationId;
}