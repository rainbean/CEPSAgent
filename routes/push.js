
var _subscribed = false;
var _queue = [];

function dequeue(onNotify) {
	onNotify(_queue.pop());
}

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
	var path = helper.config.server[0].sub + '/' + helper.config.endpoint.id;
	var options = {
			hostname: helper.config.server[0].address,
			port: helper.config.server[0].port,
			path: path,
			method: 'GET',
		};
	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		//console.log(res.statusCode);
		switch (res.statusCode) {
		case 304:
			// Quote from Node.js API
			//    On the next loop around the event loop call this callback. This is not a simple alias
			// to setTimeout(fn, 0), it's much more efficient. It typically runs before any other I/O 
			// events fire, but there are some exceptions.
			
			if (_subscribed) {
				longPolling(onNotify);
				//asyncInvoke(longPolling, onNotify);
			}
			break;
		case 200:
			if (_subscribed) {
				longPolling(onNotify);
				res.on('data', function(data) {
					_queue.push(JSON.parse(data));
					asyncInvoke(dequeue, onNotify);
				});
				//asyncInvoke(longPolling, onNotify);
				return;
			}
			break;
		default:
			console.error('Got subscription error: ' + res.statusCode);
			process.exit(1);
			break;
		}
		res.on('data', function (data) {}); // always consume data trunk
	}).on('error', function(e) {
		console.error("Got subscription error: " + e.message);
		process.exit(1);
	});
	req.end();
}

exports.subscribe = longPolling;
/**
 * Unsubscribe long polling notification channel 
 * 
 * Received JSON messages are forward to onNotify()  
 */
exports.unsubscribe = function () {
	_subscribed = false;
};