"use strict";

const mdns = require("mdns-js");

// Starts MDNS advertisement.
function start(API_SERVICE_NAME, API_SERVICE_PORT) {
  console.log(`Advertising service as  _${API_SERVICE_NAME}._tcp on port ${API_SERVICE_PORT}`);
  var service = mdns.createAdvertisement(mdns.tcp(API_SERVICE_NAME), API_SERVICE_PORT, {
    name: "hello",
    txt: {
      txtvers: "1"
    }
  });
  service.start();
}
module.exports.start = start;
