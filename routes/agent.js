
/**
 * handle HTTP push notification
 * @param data HTTP body object 
 * @return true if message handled, false for next handler
 */
function onPush(data) {
	var network = require("./networkprofile");
	var session = require("./sessionprofile");
	
	var json = JSON.parse(data);
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
	var S = require('string');
	var constant = require("./constants");
	var helper = require('./helper.js');
	var network = require("./networkprofile");
	var session = require("./sessionprofile");

	var json = {Remote: remote};

	console.log(remote.address + ':' + remote.port +' - ' + msg.length);
    
	if (msg.length < constant.LEN_MIN_CEPS_MSG) {
		return; // drop message silently
	}

	if (constant.CEPS_MAGIC_CODE !== msg.readUInt32BE(0)) {
		return; // invalid magic code
	}

	if (1 !== msg.readUInt8(4)) {
		return; // verify version
	}
	
	json.Type = msg.readUInt16BE(5); // msg type
	var len = msg.readUInt16BE(7); // data length
	
	var buf = new Buffer(16);
	msg.copy(buf, 0, 9, constant.LEN_MIN_CEPS_MSG); // msg nonce
	var nonce = helper.toString(buf);
	json.Nonce = S(nonce).replaceAll('\u0000', '').trim().s; // remove null or white space
	
	if (len > 0) {
		json.Data = new Buffer(len);
		msg.copy(json.Data, 0, constant.LEN_MIN_CEPS_MSG, constant.LEN_MIN_CEPS_MSG+len); // msg data
	}
	
	// call handlers
	if (network.onMessage(json)) {
		return;
	}
	
	if (session.onMessage(json)) {
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
	var push = require("./push");
	var network = require("./networkprofile");

	// read configure and write back in case it was empty
	helper.getConfig();
	helper.setConfig();
	//console.log (helper.config);
	
	// subscribe push channel
	push.subscribe(onPush);
	
	// init UDP daemon
	initUDPD();
	
	// init network profile
	network.init();
};

