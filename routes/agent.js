
/**
 * handle HTTP push notification
 * @param json a json object 
 * @return true if message handled, false for next handler
 */
function onPush(json) {
	var network = require("./networkprofile");
	var session = require("./sessionprofile");
	
	console.log(json);
	
	if (network.onPush(json)) {
		return;
	}
	if (session.onPush(json)) {
		return;
	}

	console.log ('Unserved push message: ' + json.type);
}

/**
 * Handle UDP message request
 * 
 * @param msg Received UDP message 
 * @param remote Remote peer address 
 */
function onMessage(msg, remote) {
	var helper = require('./helper.js');
	var network = require("./networkprofile");
	var session = require("./sessionprofile");
	var chat = require("./chat");

	console.log(remote.address + ':' + remote.port +' - ' + msg.length);
    
	// {Type:1, Data: [], Nonce:"Rose"}
	var json = helper.getCepsUdpMsg(msg);
	if (!json) {
		return; // invalid message
	}
	json.Remote = remote;

	// call handlers
	if (network.onMessage(json)) {
		return;
	}
	
	if (session.onMessage(json)) {
		return;
	}
	
	if (chat.onMessage(json)) {
		return;
	}
}


/**
 * Create UDP daemon to listen for UDP request 
 */
function initUDPD() {
	var helper = require("./helper");
	var dgram = require('dgram');
	var udpd = dgram.createSocket('udp4');
	
	udpd.on('listening', function () {
		var address = udpd.address();
		console.log('UDP Server listening on ' + address.address + ":" + address.port);
		if (address.port !== helper.config.endpoint.port) {
			helper.config.endpoint.udp = address.port;
			helper.setConfig();
		}
	});
	
	udpd.on('message', onMessage);

	// udpd.bind(helper.config.endpoint.udp, '127.0.0.1'); // bind loopback interface
	udpd.bind(helper.config.endpoint.udp); // bind all interface
}

/**
 * Initialize CEPS Agent  
 */
exports.init = function () {
	var helper = require("./helper");
	var network = require("./networkprofile");

	// read configure and write back in case it was empty
	helper.getConfig();
	helper.setConfig();
	
	// init UDP daemon
	initUDPD();
	
	// init network profile
	network.init(onPush);
};

// session profile: {"Version":1,"Type":"CmdSaveSession","SocketType":"UDP","LocalPort":8080,"Destination":{"IP":"140.1.1.1","Port":38080},"Nonce":"Rose"}
var _session = {};

/**
 * GET connection link with peer endpoint
 */
exports.link = function(req, res) {
	var helper = require("./helper");
	var session = require("./sessionprofile");

	session.init(req.params.EndpointID, function(err, result) {
		if (err) {
			console.log('Failed to connect to eid:' + req.params.EndpointID + ', error:' + err);
			return res.send(404);
		}
		_session = result;
		return res.send(200);
	});
};

/**
 * Send message to establish session
 */
exports.talk = function(req, res) {
	var helper = require("./helper");
	var constant = require('./constants');

	if (!_session) {
		return res.send(404);
	}
	
	var msg = _session;
	msg.Type = constant.DATA_MSG;
	msg.Data = new Buffer(req.params.Message);
	helper.sendCepsUdpMsg(msg);
	
	return res.send(200);
};
