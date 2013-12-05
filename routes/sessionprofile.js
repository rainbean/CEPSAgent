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
		var url = helper.cmsaddr + listener.Reply.Error + '?ErrorCode=' + 408 + '&ErrorDesc=Timeout';
		http.get(url, onResponse).on('error', function(e) {
			console.log("Failed to send HTTP request, error: " + e.message);
			// abort session negociation on error
			onInitDoneCallback(e);
		});
	}
}


/**
 * Send "ReqSendMsg" message to specific address and port from specific local port, N times continuously
 *  
 * @param msg a json object, syntax: {LocalPort:8080, Destination: {IP: "140.1.1.1", Port: 38080}, Nonce:"Rose", Count: 5 }
 */
function sendUDPMessage(msg) {
	var dgram = require('dgram');
	var helper = require('./helper');
	var constant = require("./constants");

	var udp = new Buffer(constant.LEN_REQ_SEND_MSG);
	
	udp.fill(0x00); // clear with zero 
	udp.writeUInt32BE(constant.CEPS_MAGIC_CODE, 0);  // magic code
	udp.writeUInt8(1, 4); // version
	udp.writeUInt16BE(constant.REQ_SEND_MSG, 5); // msg type
	udp.writeUInt16BE(0x0000, 7); // zero body length
	var nonceBytes = helper.toBytes(msg.Nonce);
	nonceBytes.copy(udp, 9);
		
	var client = dgram.createSocket("udp4");
	client.bind(msg.LocalPort, function() {
		var count = msg.Count;
		if (typeof(count) === 'undefined' || count === null ||
				count <= 0 || count >= 20) {
			count = 1; // reset to once
		}
		
		var done = count;
		for (var i=0; i<count; ++i) {
			client.send(udp, 0, udp.length, msg.Destination.Port, msg.Destination.IP, function(err, bytes) {
				done --;
				console.log('Send out udp message: err = ' + err + ', bytes = ' +  bytes);
				if (done === 0) {
					client.close();
				}
			});
		}
	});
}

/**
 * Command handler 
 * @param json
 * @return true if message handled, false if not
 */
function onCommand(msg) {
	var http = require('http');
	var helper = require("./helper");
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
			http.get(helper.cmsaddr + msg.Reply.Ready, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
		}
		return true;
	case constant.CMD_SEND_MSG:
		// Send "ReqSendMsg" message
		sendUDPMessage(msg);
		
		// reply server
		if (msg.Reply && msg.Reply.OK) {
			http.get(helper.cmsaddr + msg.Reply.OK, onResponse).on('error', function(e) {
				console.log("Failed to send HTTP request, error: " + e.message);
				// abort session negociation on error
				onInitDoneCallback(e);
			});
		}
		return true;
	case constant.CMD_SAVE_SESSION:
		// {"Version":1,"Type":"CmdSaveSession","SocketType":"UDP","LocalPort":8080,"Destination":{"IP":"140.1.1.1","Port":38080},"Nonce":"Rose"}
		onInitDoneCallback(null, 'Session establish complete');
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
		// handle HTTP body as json command
		res.on('data', function (data) {
			var json = JSON.parse(data);
			console.log(json);
			onCommand(json);
		});
		return; // not error, return
	case 202:
		// server handled
		return; // not error, return
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
	// abort session negociation on error
	onInitDoneCallback(res.statusCode);
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
		helper.cmsaddr,
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
				break; // end loop
			}
		}

		// reply listener timeout with error
		if (listener && listener.Reply && listener.Reply.OK) {
			var url = helper.cmsaddr + listener.Reply.OK + '&MsgSrcIP=' + msg.Remote.address + '&MsgSrcPort=' + msg.Remote.port;
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
