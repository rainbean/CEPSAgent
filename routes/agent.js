/**
 * state machine table
 */
function onState(nonce){
	// to-do implement later
	var network = require("./profile/network");
	return network.saveProfile(); // ready for listen/request connection
}

/**
 * handle HTTP push notification
 */
function onPush(data) {

	//console.log(data);
	var json = JSON.parse(data);
	console.log(json);
	
	// lookup state machine / function table / nonce table
	onState(json.Nonce);
}

/**
 * Handle UDP message request
 * 
 * @param msg Received UDP message 
 * @param remote Remote peer address 
 */
function onUDP(msg, remote) {
	var http = require('http');
	var S = require('string');
	var constant = require("./constants");

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
	
	var cmd = msg.readUInt16BE(5); // msg type
	var len = msg.readUInt16BE(7); // msg length
	var nonce = msg.toString('utf8', 9, constant.LEN_MIN_CEPS_MSG); // msg nonce
	nonce = S(nonce).replaceAll('\u0000', '').trim().s; // remove null or white space
	
	if (constant.REP_GET_EXT_PORT !== cmd) {
		return; // unsupported command
	}
	
	console.log('onUDP: nonce=' + nonce);

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
	
	udpd.on('message', onUDP);

	udpd.bind(helper.config.endpoint.udp, '127.0.0.1');
};

/**
 * Initialize CEPS Agent  
 */
exports.init = function () {
	var helper = require("./helper");
	var push = require("./push");
	var network = require("./profile/network");

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

