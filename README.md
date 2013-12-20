
# CEPSAgent



## Usage



## Developing



### Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.


var helper = require('../routes/helper');
var constant = require('../routes/constants');

var msg = {Type:1, Nonce:"Rose"}
msg.Type = constant.DATA_MSG; // reuse this message and send it as udp
msg.LocalPort = 6000;
msg.Destination = {IP: '42.70.17.27', Port:6838};
var str = 'Hello Winston, this is test program';
msg.Data = new Buffer(str);
helper.sendCepsUdpMsg(msg);
helper.sendCepsUdpMsg(msg);
helper.sendCepsUdpMsg(msg);
