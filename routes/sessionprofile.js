var _onDoneCB;
var onInitDoneCallback;
var listening = [];

/**
 * Call back when session negociation is done
 */
function onInitDoneCallback(err, result) {
	if (_onDoneCB) {
		_onDoneCB(err, result);
		_onDoneCB = null;
	}
}

/**
 * Timeout on listening nonce 
 * @param nonce
 */
function onListenTimeout(nonce) {
	var http = require('http');
	var helper = require("./helper");
	var constant = require('./constants');
	
	// check if nonce matchs any listener
	var listener;
	for (var i = 0; i < listening.length; i++) {
		if (listening[i].Nonce === nonce) {
			listener = listening[i];
			listening.splice(i, 1); // remove listener
			break; // end loop
		}
	}
	
	// reply listener timeout with error
	if (listener && listener.Reply && listener.Reply.Error) {
		var url = 'http://' + helper.config.server.address + helper.config.server.cms +
			listener.Reply.Error + '?ErrorCode=' + 408 + '&ErrorDesc=Timeout';
		http.get(url, onResponse).on('error', function(e) {
			console.log("Failed to send HTTP request, error: " + e.message);
			// abort session negociation on error
			onInitDoneCallback(e);
		});
	}
}

/**
 * Command handler 
 * @param json
 * @return true if message handled, false if not
 */
function onCommand(msg) {
	var http = require('http');
	var helper = require('./helper');
	var constant = require('./constants');

	switch (msg.Type) {
	case constant.CMD_LISTEN_MSG:
		// create new listener with timeout
		if (msg.Reply && msg.Timeout > 0) {
			var listener = {TimeoutID: null, Nonce: msg.Nonce, Reply: msg.Reply};
			listener.TimeoutID = setTimeout(onListenTimeout, 1000 * msg.Timeout, msg.Nonce);
			listening.push(listener);
		}
		
		// reply listener ready 
		if (msg.Reply && msg.Reply.Ready) {
			http.get('http://' + helper.config.server.address + helper.config.server.cms + msg.Reply.Ready, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
		}
		return true;
	case constant.CMD_SEND_MSG:
		// Send "ReqSendMsg" message
		msg.Type = constant.REQ_SEND_MSG; // reuse this message and send it as udp
		helper.sendCepsUdpMsg(msg);
		
		// reply server
		if (msg.Reply && msg.Reply.OK) {
			http.get('http://' + helper.config.server.address + helper.config.server.cms + msg.Reply.OK, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
		}
		return true;
	case constant.CMD_SAVE_SESSION:
		onInitDoneCallback(null, msg);
		return true;
	case constant.CMD_GET_EXT_PORT:
	case constant.CMD_MAP_UPNP:
		return false;
	default:
		return false;
	}
}

/**
 * HTTP response body handler 
 * @param res HTTP response object
 */
function onResponse(res) {
	res.setEncoding('utf8');
	switch (res.statusCode) {
	case 200:
	case 202:
		break;
	case 400:
		console.error('Malformed syntax');
		break;
	case 401:
		console.error('Invalid endpoint id');
		break;
	case 403:
		console.warn('no valid connection link');
		break;
	case 404:
		console.warn('peer not exist');
		break;
	default:
		console.log('Server error code:' + res.statusCode);
		break;
	}
	
	// Quote from node.js API:
	//
	// If no 'response' handler is added, then the response will be entirely discarded. 
	// However, if you add a 'response' event handler, then you must consume the data from 
	// the response object, either by calling response.read() whenever there is a 'readable' 
	// event, or by adding a 'data' handler, or by calling the .resume() method. 
	// 
	// Until the data is consumed, the 'end' event will not fire. Also, until the data is read 
	// it will consume memory that can eventually lead to a 'process out of memory' error.
	//
	res.on('data', function (data) { // always consume data trunk
		if (res.statusCode === 200) {
			// handle HTTP body as json command
			var json = JSON.parse(data);
			console.log(json);
			onCommand(json);
		}
	});
	
	// abort session negociation on error
	if (res.statusCode !== 200 && res.statusCode !== 202) {
		onInitDoneCallback(res.statusCode);
	}
}


/**
 * Init connection
 * 
 * @param eid peer endpoint id to connect to
 * @param callback error and/or result 
 */
exports.init = function (eid, onDone) {
	var http = require('http');
	var helper = require("./helper");

	_onDoneCB = onDone;
	
	// ask server to init session negociation
	// GET /v1/SessionProfile/{SocketType}/{Requestor's EndpointID}/{Destination's EndpointID}	
	var url = [
		'http://' + helper.config.server.address + helper.config.server.cms,
		'SessionProfile',
		'UDP',
		helper.config.endpoint.id,
		eid
	].join('/');
	
	http.get(url, onResponse).on('error', function(e) {
		console.log("Failed to send HTTP request, error: " + e.message);
		// abort session negociation on error
		onInitDoneCallback(e);
	});

};

function async_template(eid, onDone) {
	var async = require('async');

	// ToDo: replace placeholder code
	async.series([
		function(callback) {
			// do some stuff ...
			callback(null, 'one');
		},
		function(callback) {
			// do some more stuff ...
			callback(null, 'two');
		}
	],
	//optional callback
	function(err, results) {
		// results is now equal to ['one', 'two']
		console.log(results);
		onDone(null, results);
	});
}


/**
 * handle HTTP push notification
 * @param json JSON object 
 * @return true if message handled, false for next handler
 */
exports.onPush = function(msg) {
	return onCommand(msg);
};

/**
 * UDP message handler
 * 
 * @param json Received UDP message in JSON 
 * @return true if message handled, false for next handler
 */
exports.onMessage = function(msg) {
	var http = require('http');
	var helper = require("./helper");
	var constant = require("./constants");
	
	switch (msg.Type) {
	case constant.REQ_SEND_MSG:
		// check if nonce matchs any listener
		var listener;
		for (var i = 0; i < listening.length; i++) {
			if (listening[i].Nonce === msg.Nonce) {
				listener = listening[i];
				listening.splice(i, 1);	// remove listener
				clearTimeout(listener.TimeoutID); // remove timer 
				break; // end loop
			}
		}

		// reply listener timeout with error
		if (listener && listener.Reply && listener.Reply.OK) {
			//console.log('Get UDP REQ_SEND_MSG, send ok reply to server');
			var url = 'http://' + helper.config.server.address + helper.config.server.cms +
				listener.Reply.OK + '&MsgSrcIP=' + msg.Remote.address + '&MsgSrcPort=' + msg.Remote.port;
			http.get(url, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
		}
		return true;
	default:
		return false;
	}
};
