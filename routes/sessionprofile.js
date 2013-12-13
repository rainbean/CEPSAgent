var _onDoneCB;
var onInitDoneCallback;
var timers = [];

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
function onTimeout(nonce) {
	var http = require('http');
	var helper = require("./helper");
	var constant = require('./constants');
	
	// check if nonce matchs any listener
	var t;
	for (var i = 0; i < timers.length; i++) {
		if (timers[i].Nonce === nonce) {
			t = timers[i];
			timers.splice(i, 1); // remove listener
			break; // end loop
		}
	}
	
	// reply listener timeout with error
	if (t && t.Reply && t.Reply.Error) {
		var path = helper.config.server[0].cms + t.Reply.Error + '?ErrorCode=' + 408 + '&ErrorDesc=Timeout';
		var options = {
				hostname: helper.config.server[0].address,
				port: helper.config.server[0].port,
				path: path,
				method: 'GET',
			};
		var req = http.request(options, onResponse).on('error', function(e) {
			console.log("Failed to send HTTP request, error: " + e.message);
			// abort session negociation on error
			onInitDoneCallback(e);
		});
		req.end();
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
	var isHandled = true;
	var path;
	var options;
	var req;

	switch (msg.Type) {
	case constant.CMD_LISTEN_MSG:
		// create new listener with timeout
		if (msg.Reply && msg.Timeout > 0) {
			var timer = {ID: null, Nonce: msg.Nonce, Reply: msg.Reply};
			timer.ID = setTimeout(onTimeout, 1000 * msg.Timeout, msg.Nonce);
			timers.push(timer);
		}
		
		// reply listener ready 
		if (msg.Reply && msg.Reply.Ready) {
			path = helper.config.server[0].cms + msg.Reply.Ready;
			options = {
					hostname: helper.config.server[0].address,
					port: helper.config.server[0].port,
					path: path,
					method: 'GET',
				};
			req = http.request(options, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
			req.end();
		}
		break;
	case constant.CMD_SEND_MSG:
		// Send "ReqSendMsg" message
		msg.Type = constant.REQ_SEND_MSG; // reuse this message and send it as udp
		helper.sendCepsUdpMsg(msg);
		
		// reply server
		if (msg.Reply && msg.Reply.OK) {
			path = helper.config.server[0].cms + msg.Reply.OK;
			options = {
					hostname: helper.config.server[0].address,
					port: helper.config.server[0].port,
					path: path,
					method: 'GET',
				};
			req = http.request(options, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
			req.end();
		}
		break;
	case constant.CMD_SAVE_SESSION:
		onInitDoneCallback(null, msg);
		break;
	case constant.CMD_GET_EXT_PORT:
	case constant.CMD_MAP_UPNP:
		isHandled = false;
		break;
	default:
		isHandled = false;
		break;
	}
	
	return isHandled;
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
	var path = helper.config.server[0].cms + 'SessionProfile/UDP/' + helper.config.endpoint.id + '/' + eid;
	var options = {
			hostname: helper.config.server[0].address,
			port: helper.config.server[0].port,
			path: path,
			method: 'GET',
		};
	var req = http.request(options, onResponse).on('error', function(e) {
		console.log("Failed to send HTTP request, error: " + e.message);
		// abort session negociation on error
		onInitDoneCallback(e);
	});
	req.end();
};


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
		var t;
		for (var i = 0; i < timers.length; i++) {
			if (timers[i].Nonce === msg.Nonce) {
				t = timers[i];
				timers.splice(i, 1);	// remove listener
				clearTimeout(t.ID); // remove timer 
				break; // end loop
			}
		}

		// reply ok
		if (t && t.Reply && t.Reply.OK) {
			//console.log('Get UDP REQ_SEND_MSG, send ok reply to server');
			var path = helper.config.server[0].cms + t.Reply.OK + '&MsgSrcIP=' + msg.Remote.address + '&MsgSrcPort=' + msg.Remote.port;
			var options = {
					hostname: helper.config.server[0].address,
					port: helper.config.server[0].port,
					path: path,
					method: 'GET',
				};
			var req = http.request(options, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
			req.end();
		}
		return true;
	default:
		return false;
	}
};
