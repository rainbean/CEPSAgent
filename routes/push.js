
var _subscribed = false;

/**
 * Subscribe long polling notification channel, 
 * and keep it alive until unsubscribe is called. 
 * 
 * Received JSON messages are forward to onNotify()  
 */
exports.subscribe = function (onNotify) {
	var http = require('http');
	var helper = require('./helper');
	
	_subscribed = true;
	
	// Make a HTTP GET request to push module
	var url = 'http://' + helper.config.server.address + helper.config.server.sub + '/' + helper.config.endpoint.id;
	http.get(url, function(res) {
		res.setEncoding('utf8');
		//console.log(res.statusCode);
		switch (res.statusCode) {
		case 304:
			// Time out, reconnect push module
			// Here in fact is NOT infinite recursive function call, but up to 2 levels
			// Okay to replace with setTimeout(...) 
			if (	_subscribed) {
				module.exports.subscribe(onNotify);
			}
			break;
		case 200:
			if (_subscribed) {
				module.exports.subscribe(onNotify);
				res.on('data', onNotify);
			}
			break;
		default:
			console.log('Got subscription error: ' + res.statusCode);
			break;
		}
	}).on('error', function(e) {
		console.log("Got subscription error: " + e.message);
	});
};

/**
 * Unsubscribe long polling notification channel 
 * 
 * Received JSON messages are forward to onNotify()  
 */
exports.unsubscribe = function () {
	_subscribed = false;
};