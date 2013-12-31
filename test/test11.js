var PORT = 21000;

var dgram = require('dgram');
var server = dgram.createSocket('udp4');

server.on('listening', function () {
    var address = server.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
    client(address.port);
});

server.on('message', onMsg);

function client(port) {
  var helper = require('../routes/helper');

  var msg = {Type:1, LocalPort:port, Destination: {IP: "ceps.cloudapp.net", Port: 23400}, Nonce:"Rose"};

  helper.sendCepsUdpMsg(msg);
  helper.sendCepsUdpMsg(msg);
  helper.sendCepsUdpMsg(msg);
}

function onMsg (message, remote) {
    console.log(remote.address + ':' + remote.port +' - ' + message.length);
}

server.bind(PORT);
