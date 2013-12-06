var _subscribed = false;
var _lastmodify;
var _etag = 0;

function onPush(data) {
	console.log(data);
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
function subscribe(onNotify) {
	var http = require('http');
	
	_subscribed = true;
	
	var options = {
		hostname: 'ceps.cloudapp.net',
		port: 80,
		path: '/sub/8519e8f67a3eecb0fd888f652a9ee5f1',
		method: 'GET',
	};
	if (_lastmodify) {
		options.headers = {'If-Modified-Since': _lastmodify};
	}
	
	// Make a HTTP GET request to push module
	var url = 'http://ceps.cloudapp.net/sub/8519e8f67a3eecb0fd888f652a9ee5f1';
	http.get(options, function(res) {
		res.setEncoding('utf8');
		//console.log(res.statusCode);
		
		_lastmodify = res.headers['last-modified'];
		//_etag = res.headers['etag'];
		console.log(_lastmodify);
		console.log(_etag);
		
		for(var item in res.headers) {
		    console.log(item + ": " + res.headers[item]);
		}
		
		switch (res.statusCode) {
		case 304:
			// Time out, reconnect push module
			// Here in fact is NOT infinite recursive function call, but up to 2 levels
			// Okay to replace with setTimeout(...)
			if (	_subscribed) {
				asyncInvoke(subscribe, onNotify);
			}
			break;
		case 200:
			if (_subscribed) {
				res.on('data', function(data) {
					asyncInvoke(onNotify, data);
				});
				asyncInvoke(subscribe, onNotify);
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

/**
 * Unsubscribe long polling notification channel 
 * 
 * Received JSON messages are forward to onNotify()  
 */
function unsubscribe() {
	_subscribed = false;
};

subscribe(onPush);


