# Amazon Alexa Hue Bridge for Node.js
A simple Node.js Module that simulate a Philips Hue Bridge.

 Feel free to spend me a beer for this work over Paypal sor3nt@gmail.com, thank you!

## How to use:

```
new (require('./Alexa.js').server)({
    localIp: '192.168.0.22',            // local IP (not the alexa ip)
    port: 8080,                         // http server port
    bridgeName: 'amazon-ha-bridge10',   // bridge name
    devices: [                          // devices
        {
            id: 1,
            name: 'Anlage',             // Device name also trigger word
            state: false,               // Current state (on/off)
            off: 'AnlageOff.sh',        // turn off script
            on: 'AnlageOn.sh'           // turn on script
        }
    ]
});
```
This Call will create a HTTP Server listen on Port `8080`, ready to receive the UPnP search from Alexa. Also a UPnP Server will be created to detect Alexa and interact with her.

After you run your Server ``` node index.js ``` you can trigger Alexa to search for new devices. She will find your devices by the given name. You can now use the device name as trigger like Alexa, turn on `device-name`

You do not need to create any Groups, Alexa will find them by the given device Name.


