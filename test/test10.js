var helper = require('../routes/helper');
var constant = require('../routes/constants');

var msg = {Type:1, Nonce:"Rose"}
msg.Type = constant.DATA_MSG; // reuse this message and send it as udp
msg.LocalPort = 21000;
//msg.Destination = {IP: 'localhost', Port:21000};
//msg.Destination = {IP: '114.34.18.97', Port:21000};
//msg.Destination = {IP: '220.128.1.237', Port:58419};
msg.Destination = {IP: '42.71.231.41', Port:58428};
//msg.Destination = {IP: 'ceps.cloudapp.net', Port:23400};
var str = 'Hello Winston, this is test program';
msg.Data = new Buffer(str);
helper.sendCepsUdpMsg(msg);
helper.sendCepsUdpMsg(msg);
helper.sendCepsUdpMsg(msg);

