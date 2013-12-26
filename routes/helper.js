/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
exports.createGUID = function(withDash) {
	function _p8(s) {
		var p = (Math.random().toString(16)+"000000000").substr(2,8);
		return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
	}
	return _p8() + _p8(withDash) + _p8(withDash) + _p8();
};

/**
 * Convert hex string to bytes array
 */
exports.toBytes = function(str) {
	var bytes = new Buffer(str.length / 2);
	for (var i = 0; i < str.length; i += 2) {
		bytes[i/2] = parseInt(str.substr(i, 2), 16);
	}
	return bytes;
};

/**
 * Convert bytes array to hex string
 */
exports.toString = function(bytes) {
	var hex = [];
	for (var i=0; i<bytes.length; i++) {
		// var b = bytes[i].toString(16); // without zero padding
		var b = ('00'+bytes[i].toString(16)).substr(-2,2); // with zero padding
		hex.push(b);
	}
	return hex.join('');
};

// configuration store
exports.config = {};

/**
 * Read configuration from file
 */
exports.getConfig = function () {
	var fs = require('fs');
	var os = require('os');
	var _config;
	
	// interesting myth of current path 
	if (fs.existsSync('./config.json')) {
		_config = require('../config.json');
	}
	
	if (!_config) {
		_config = {user: {id: 1000, name: 'test'}};
	}

	// check server setting
	if (!_config.ServerInfo) {
		console.error('Invalid ServerInfo URL, please modify config.json!!!');
		process.exit(1);
	}
	
	if (!_config.endpoint) {
		_config.endpoint = {
				id: module.exports.createGUID(),
				name: os.hostname(), // hostname as default
				udp:21000 // default port, will adjust to binding result later
			};
	}
	
	//console.log(_config);
	module.exports.config = _config;
};

/**
 * Write configuration to file
 */
exports.setConfig = function () {
	var fs = require('fs');
	
	fs.writeFile('./config.json', JSON.stringify(module.exports.config,null,2)); // make json file pretty
};


/**
 * Bounce www.google.com for real network IP
 * 
 * @param callback
 * @returns
 */
exports.getNetworkIPAsync = function(callback) {
	var net = require('net');
	var socket = net.createConnection(80, 'www.google.com');
	socket.on('connect', function() {
		callback(undefined, socket.address().address);
		socket.end();
	});
	socket.on('error', function(e) {
		callback(e, 'error');
	});
};

/*
function isPublicIPAsync () {
	// async check mechanism
	getNetworkIPAsync(function (error, ip) {
		console.log(ip);
		if (error) {
			console.log('error:', error);
		}
	});
}
*/

/**
 * Get network IPs
 * 
 * @returns list of network ip
 */
exports.getNetworkIP = function() {
	var os = require('os');
	var ifaces = os.networkInterfaces();
	var addresses = [];
	for (var x in ifaces) {
		ifaces[x].forEach(function(addr) {
			if (addr.family === 'IPv4' && !addr.internal) {
				addresses.push(addr.address);
			}
		});
	}
	return addresses;
};

/**
 * Parse CEPS UDP message
 * @param msg UDP Buffer array
 * @param msg a json object, syntax: {Type:1, Data: [], Nonce:"Rose"}
 */
exports.getCepsUdpMsg = function(msg) {
	var S = require('string');
	var constant = require("./constants");
	var helper = require('./helper.js');

	var json = {};

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
	
	if (len > 0 && len < 1024) { // avoid buffer overflow accident
		json.Data = new Buffer(len);
		msg.copy(json.Data, 0, constant.LEN_MIN_CEPS_MSG, constant.LEN_MIN_CEPS_MSG+len); // msg data
	}

	return json;
};

function printLog(msg) {
	var _ = require("./constants");
	var cmd = '';
	switch (msg.Type) {
	case _.REQ_SEND_MSG:
		cmd = 'REQuest_SEND_MSG';
		break;
	case _.REP_SEND_MSG:
		cmd = 'REPly_SEND_MSG';
		break;
	case _.REQ_GET_EXT_PORT:
		cmd = 'REQuest_GET_EXT_PORT';
		break;
	case _.DATA_MSG:
		cmd = 'DATA_MSG';
		break;
	}
	console.log('Send UDP <' + cmd + '> to ' + msg.Destination.IP + ':' + msg.Destination.Port);
}

/**
 * Send CEPS message to specific address and port from specific local port, N times continuously
 *  
 * @param msg a json object, syntax: {Type:1, LocalPort:8080, Destination: {IP: "140.1.1.1", Port: 38080}, Nonce:"Rose", Count: 5 }
 */
exports.sendCepsUdpMsg = function(msg) {
	var dgram = require('dgram');
	var constant = require("./constants");

	var udp = new Buffer(constant.LEN_MIN_CEPS_MSG);

	if (msg.Data && !Buffer.isBuffer(msg.Data)) {
		throw new Error('Data shall be Buffer type');
	}
	
	udp.fill(0x00); // clear with zero 
	udp.writeUInt32BE(constant.CEPS_MAGIC_CODE, 0);  // magic code
	udp.writeUInt8(1, 4); // version
	udp.writeUInt16BE(msg.Type, 5); // msg type
	if (msg.Data) {
		udp.writeUInt16BE(msg.Data.length, 7);
	}
	var nonceBytes = module.exports.toBytes(msg.Nonce);
	nonceBytes.copy(udp, 9);
	if (msg.Data) {
		udp = Buffer.concat([udp, msg.Data]); // concat dataBytes to end of udp array
	}

	var client = dgram.createSocket("udp4");
	client.bind(msg.LocalPort, function() {
		var count = msg.Count;
		if (typeof(count) === 'undefined' || count === null ||
				count <= 0 || count >= 20) {
			count = 1; // reset to once
		}
		
		printLog(msg);
		
		var done = count;
		for (var i=0; i<count; ++i) {
			client.send(udp, 0, udp.length, msg.Destination.Port, msg.Destination.IP, function(err, bytes) {
				done --;
				//console.debug('Send out udp message: err = ' + err + ', bytes = ' +  bytes);
				if (done === 0) {
					client.close();
				}
			});
		}
	});
};


