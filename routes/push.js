
var _subscribed = false;

var asyncInvoke = function(callback, data){
	process.nextTick(function(){
		callback(data);
	});
};

/**
 * Subscribe long polling notification channel, 
 * and keep it alive until unsubscribe is called. 
 * 
 * Received JSON messages are forward to onNotify()  
 */
function longPolling(onNotify) {
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
			// Quote from Node.js API
			//    On the next loop around the event loop call this callback. This is not a simple alias
			// to setTimeout(fn, 0), it's much more efficient. It typically runs before any other I/O 
			// events fire, but there are some exceptions.
			
			if (_subscribed) {
				asyncInvoke(longPolling, onNotify);
			}
			break;
		case 200:
			if (_subscribed) {
				asyncInvoke(longPolling, onNotify);
				res.on('data', function(data) { 
					asyncInvoke(onNotify, data);
				});
				return;
			}
			break;
		default:
			console.log('Got subscription error: ' + res.statusCode);
			break;
		}
		res.on('data', function (data) {}); // always consume data trunk
	}).on('error', function(e) {
		console.log("Got subscription error: " + e.message);
	});
};

exports.subscribe = longPolling;
/**
 * Unsubscribe long polling notification channel 
 * 
 * Received JSON messages are forward to onNotify()  
 */
exports.unsubscribe = function () {
	_subscribed = false;
};