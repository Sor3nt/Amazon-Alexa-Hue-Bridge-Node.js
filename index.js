
new (require('./Alexa.js').server)({

    // local IP (not the alexa ip)
    localIp: '192.168.0.22',

    // http server port
    port: 8080,

    //bridge name
    bridgeName: 'amazon-ha-bridge10',

    //devices
    devices: [
        {
            id: 1,
            name: 'itunes',
            state: false,
            off: 'itunesOff.sh',
            on: 'itunesOn.sh'
        }
    ]
});
