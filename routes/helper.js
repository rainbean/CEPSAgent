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
exports.serverinfo;

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
	if (!_config.server) {
		console.log('Invalid server config, please modify config.json!!!');
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

