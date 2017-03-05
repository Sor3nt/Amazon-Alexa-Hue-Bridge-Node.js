
/**
 * Amazon Alexa Hue Bridge for Node.js
 * Feel free to spend me a beer for this work <paypal:sor3nt@gmail.com>, thank you!
 *
 * A simple NodeJs Module that simulate a Philips Hue Bridge.
 *
 */

var http = require('http');
var sprintf = require('sprintf-js').sprintf;
var exec = require('child_process').exec;
var dgram = require("dgram");

var hueTemplate = "<?xml version=\"1.0\"?>\n" +
    "<root xmlns=\"urn:schemas-upnp-org:device-1-0\">\n" +
        "<specVersion>\n" +
            "<major>1</major>\n" +
            "<minor>0</minor>\n" +
        "</specVersion>\n" +

        "<URLBase>http://%s:%s/</URLBase>\n" +

        "<device>\n" +
            "<deviceType>urn:schemas-upnp-org:device:Basic:1</deviceType>\n" +
            "<friendlyName>%s</friendlyName>\n" +
            "<manufacturer>Royal Philips Electronics</manufacturer>\n" +
            "<manufacturerURL>http://www.armzilla.com</manufacturerURL>\n" +
            "<modelDescription>Hue Emulator for Amazon Echo bridge</modelDescription>\n" +
            "<modelName>Philips hue bridge 2012</modelName>\n" +
            "<modelNumber>929000226503</modelNumber>\n" +
            "<modelURL>http://www.armzilla.com/amazon-echo-ha-bridge</modelURL>\n" +
            "<serialNumber>%s</serialNumber>\n" +
            "<UDN>uuid:%s</UDN>\n" +
        "</device>\n" +
    "</root>\n";

module.exports.server = function( options ){

    var self = {

        _server: false,
        _socket: false,

        _devices: options.devices,

        _init: function () {
            //Create HTTP Server
            self._server = http.createServer(self._onRequest);

            self._server.listen(options.port, function(err){
                if (err) return;
                console.log('[HTTP] Server is listening on %s:%s', options.localIp, options.port);
            });

            //Create UPnP Server
            self._socket = dgram.createSocket('udp4');
            self._socket.on('listening', function () {
                self._socket.addMembership('239.255.255.250');
            });

            self._socket.bind(1900);
            self._socket.on('message', self._onMessage);
            console.log('[UPNP] Server is listening on %s:1900', options.localIp);
        },

        _onRequest: function (request, response) {

            var url = request.url;
            console.log('[HTTP] Request received %s', request.url);

            if (url.match(/\/upnp\/(.*)\/setup\.xml/gi) !== null){
                self._onSetupRequest(request, response);

            }else if( request.url.substr(0, 4) == '/api'){

                // /api/{userId}/lights/{lightId}/state
                if (url.match(/\/api\/(.+)\/lights\/(.+)\/state$/gi) !== null){
                    self._changeDeviceState(request, response);

                // /api/{userId}/lights/{lightId}
                }else if (url.match(/\/api\/(.+)\/lights\/(.+)$/gi) !== null){

                    self._sendCurrentDeviceState(request, response);

                // /api/{userId}/lights
                }else if (url.match(/\/api\/(.+)\/lights/gi) !== null){
                    self._sendAvailableDeviceNames(request, response);

                // /api/{userId}
                }else if (url.match(/\/api\/(.+)/gi) !== null){
                    self._sendDeviceList(request, response);
                }
            }
        },

        /**
         *  Request handler
         */
        _onSetupRequest: function (request, response ) {
            console.log("[HTTP] Receive Setup Request");

            var template = sprintf(
                hueTemplate,
                options.localIp,
                options.port,
                options.localIp,
                options.bridgeName,
                options.bridgeName
            );

            response.end(template);
        },

        _sendDeviceList: function (request, response) {
            console.log("[HTTP] Receive User Request");

            var deviceList = { lights: {} };

            for(var i in self._devices){
                var device = self._devices[i];

                deviceList.lights[device.id] = {
                    state: {
                        on : device.state,
                        reachable: true
                    },
                    name: device.name,
                    uniqueid: device.id,
                    manufacturername: 'Open-Source',
                    type: 'Extended color light',
                    modelid: 'LCT001',
                    swversion: '65003148'
                };
            }

            response.end(JSON.stringify(deviceList));
        },

        _sendAvailableDeviceNames: function (request, response) {
            console.log("[HTTP] Receive User Lights Request");

            var lights = {};
            for(var i in self._devices) {
                var device = self._devices[i];
                lights[device.id] = device.name;
            }

            response.end(JSON.stringify(lights));
        },

        _changeDeviceState: function (request, response) {
            console.log("[HTTP] Receive State Request ", request.method);

            var lightId = request.url.split('/');
            lightId = lightId[4];

            var responseJson = '';
            request.on('data', function(chunk){
                responseJson += chunk.toString();
            });

            request.on('end', function(){
                responseJson = JSON.parse(responseJson);

                var responseString, execute, found = false;

                for(var i in self._devices) {
                    var device = self._devices[i];

                    if (device.id == lightId ){
                        found = true;

                        console.log("Use Device", device.name);
                        if (device.state && responseJson.on == false){
                            responseString = "[{\"success\":{\"/lights/" + lightId + "/state/on\":true}}]";
                            execute = device.off;
                        }else{
                            responseString = "[{\"success\":{\"/lights/" + lightId + "/state/on\":false}}]";
                            execute = device.on;
                        }

                        exec(execute, function(error, stdout, stderr) {
                            if (error) {
                                response.status = 400;
                                response.end();
                            }
                            console.log("result", stdout);
                        });

                        self._devices[i].state = !device.state;

                    }
                }

                if (!found) response.status = 404;

                response.end(responseString);
            });
        },

        // /api/{userId}/lights/{lightId}
        _sendCurrentDeviceState: function (request, response) {
            console.log("[HTTP] Receive Lights Request");

            var lightId = request.url.split('/');
            lightId = lightId[4];

            var obj = {};

            for(var i in self._devices) {
                var device = self._devices[i];
                if (device.id == lightId){
                    obj = {
                        state: {
                            on : device.state,
                            reachable: true,
                            effect: "none",
                            alert: "none"
                        },
                        name: device.name,
                        id: device.id,
                        uniqueid: device.id,
                        manufacturername: 'Open-Source',
                        type: 'Extended color light',
                        modelid: 'LCT001',
                        swversion: '65003148'
                    };

                }
            }

            response.writeHead(200, 'Content-Type', 'application/json');
            response.end(JSON.stringify(obj));
            console.log("Send", JSON.stringify(obj))

        },

        /**
         *  UPnP handler
         */
       _onMessage: function (message, rinfo) {
            var msg = message.toString();

            if (self._isSSDPDiscovery(msg)){
                console.log('[UPNP] Send UPnP response to %s:%s', rinfo.address, rinfo.port);
                self._sendResponse(rinfo.address, rinfo.port);
            }
        },

        _sendResponse: function (requester, sourcePort) {

            var discoveryTemplate = "HTTP/1.1 200 OK\r\n" +
                "CACHE-CONTROL: max-age=86400\r\n" +
                "EXT:\r\n" +
                "LOCATION: http://%s:%s/upnp/%s/setup.xml\r\n" +
                "OPT: \"http://schemas.upnp.org/upnp/1/0/\"; ns=01\r\n" +
                "01-NLS: %s\r\n" +
                "ST: urn:schemas-upnp-org:device:basic:1\r\n" +
                "USN: uuid:Socket-1_0-221438K0100073::urn:Belkin:device:**\r\n\r\n";

            var discoveryResponse = sprintf(
                discoveryTemplate,
                options.localIp,
                options.httpPort,
                options.bridgeName,
                "D1710C33-328D-4152-A5FA-5382541A92FF"
            );

            discoveryResponse = Buffer.from(discoveryResponse);

            self._socket.send(discoveryResponse, sourcePort, requester);
        },


        _isSSDPDiscovery: function(body){
            if(body == null) return false;

            return body.indexOf("M-SEARCH * HTTP/1.1") !== false &&
                body.indexOf("MAN: \"ssdp:discover\"") !== false;
        }
    };

    self._init();

    return {};
};



