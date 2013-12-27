var helper = require('../routes/helper');
var constant = require('../routes/constants');

var msg = {Type:1, Nonce:"Rose"}
msg.Type = constant.DATA_MSG; // reuse this message and send it as udp
msg.LocalPort = 6000;
msg.Destination = {IP: '192.168.114.1', Port:35482};
var str = 'Hello Winston, this is test program';
msg.Data = new Buffer(str);
helper.sendCepsUdpMsg(msg);
helper.sendCepsUdpMsg(msg);
helper.sendCepsUdpMsg(msg);

