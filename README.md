# Repo is deprecated
This repo is deprecated as efforts are put into Remote Two and its new software. Find more information about it here: www.yio-remote.com The software made for Remote Two, once released, will be available for the DIY YIO Remote.

There won't be any updates to this repo, but it will stay here on GitHub to be forked and used.

---

# YIO intergration. 1.1.2

This app enables YIO to intergrate with Homey.
It enables controll for Homey connected devices and show's their active state in real time.

## YIO Configuration

Edit the `config.json` file on YIO and include the homey "IPaddress:8936" like:

```
"integrations": {
    "homey": {
      "data": [
        {
          "data": {
            "ip": "192.168.1.10:8936"
          },
          "friendly_name": "Homey Huiskamer",
          "id": "homey1"
        },
        {
          "data": {
            "ip": "192.168.1.11:8936"
          },
          "friendly_name": "Homey Pro",
          "id": "homey2"
        }
      ],
      "mdns": "_yio2homeyapi._tcp"
    },
    "ir": {
      ...
    }
  },
```

## Requirements

A homey and a YIO remote installed.
Understanding that braking changes will happen while the intergration is in full development.
