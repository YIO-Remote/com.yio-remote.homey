# YIO intergration. 0.4.1

This app enables YIO to intergrate with Homey.
It enables controll for Homey connected devices and show's their active state.

## Install

The App can be downloaded at https://apps.athom.com/ when it reaches the public beta stage.
Code can be manually installed using athom-cli if desired, code can be found https://github.com/YIO-Remote/com.yio-remote.homey

## Configuration

Edit the `config.json` file on YIO and include the homey "IPaddress:8936" like:

```
"integration": [{
    "data": {
        "ip": "10.0.0.5:8936"
    },
    "friendly_name": "Homey",
    "id": 1,
    "obj": null,
    "plugin": "homey",
    "type": "homey"
    }
],
```

Edit the `config.json` file on YIO and include the devices you want to controll like:

```
{
    "area": "Livingroom",
    "attributes": {
        "brightness": 0,
        "state": "off"
    },
    "entity_id": "4491b6b2-8425-487a-0921-d4d9d69da098",
    "favorite": false,
    "friendly_name": "TV Light",
    "integration": "homey",
    "supported_features": ["BRIGHTNESS", "COLORTEMP", "COLOR"],
    "type": "light"
}
```

While starting the app using "athom app run" the app start's printing all compatible devices in the yio format for easy adding.

## Requirements

A homey and a YIO remote installed.
Understanding that braking changes will happen while the intergration is in full development.

## Versions

### 0.4.1

- Changed GIT to yio-remote GIT.

### 0.4.0

- Added MediaPlayer suppot.
- Started to make the code modular.

### 0.3.2

- Initial config exchange reworked.

### 0.3.1

- Initial config exchange bug fixed.

### 0.3.0

- Added collor support.
- Changed handling of initial capability states.

### 0.2.1

- Fixed a small state change bug.

### 0.2

- Fixed issues when adding many lights.
- Started cleaning code.
- Changed API calls between YIO and Homey. (Breaking)

### 0.1

- Initial proof of concept.
