"use strict";

module.exports.getLocalIp = function() {
  const interfaces = require("os").networkInterfaces();
  for (const iA in interfaces) {
    const iface = interfaces[iA];
    for (const alias of iface) {
      if (alias.family === "IPv4" && alias.address !== "127.0.0.1" && !alias.internal) return alias.address;
    }
  }
  return "0.0.0.0";
};
