/**
 * Generates a GUID string, according to RFC4122 standards.
 * @returns {String} The generated GUID.
 * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
 * @author Slavik Meltser (slavik@meltser.info).
 * @link http://slavik.meltser.info/?p=142
 */
function createGUID () {
	function _p8(s) {
		var p = (Math.random().toString(16)+"000000000").substr(2,8);
		return s ? "-" + p.substr(0,4) + "-" + p.substr(4,4) : p ;
	}
	return _p8() + _p8(true) + _p8(true) + _p8();
}

// configuration store
exports.config = {};
exports.cmsaddr = 'http://ceps.cloudapp.net/cms';
exports.subaddr = 'http://ceps.cloudapp.net/sub';
exports.serverinfo;

/**
 * Read configuration from file
 */
exports.getConfig = function () {
	var fs = require('fs');
	var _config;
	
	// interesting myth of current path 
	if (fs.existsSync('./db/config.json')) {
		_config = require('../db/config.json');
	}
	
	if (!_config) {
		_config = {user: {id: 1000, name: 'test'}};
	}
	
	/*
	if (typeof(_config.endpoint) === 'undefined' || _config.endpoint === null ||
		typeof(_config.endpoint.id) === 'undefined' || _config.endpoint.id === null ||
		_config.endpoint.id.length !== 36) {
	*/
	if (!_config.endpoint) {
		_config.endpoint = {id: createGUID(), udp:21000};
	}
	
	//console.log(_config);
	module.exports.config = _config;
};

/**
 * Write configuration to file
 */
exports.setConfig = function () {
	var fs = require('fs');
	
	fs.writeFile('./db/config.json', JSON.stringify(module.exports.config));
};

