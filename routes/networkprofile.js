// Network profile 
var profile = {
	Version:1,
	UDP: {
		Blocked:false,
		Public:false,
		UPnP: {
			Enabled:false
		},
		Router: {
			PortChange:true,
			PortRestricted:true
		}
	},
	Location: {
		ExtIP: '',
		LocalIP: '',
		LocalUDPPort: 0
	}
};

/**
 * Get server info
 * 
 * @param onDone callback function to send event to when it's done 
 */
function getServerInfo(onDone) {
	var http = require('http');
	var helper = require("./helper");
	
	http.get(helper.config.ServerInfo, function(res) {
		switch (res.statusCode) {
		case 200:
			res.on('data', function(data) {
				var json = JSON.parse(data);
				helper.config.server = json.server;
				//console.log(helper.config.server);

				// ToDo: handle multiple ip case 
				var addr = helper.getNetworkIP();
				profile.Location.ExtIP = json.requestor.IP;
				profile.Location.LocalIP = addr[0];
				profile.Location.LocalUDPPort = helper.config.endpoint.udp;
				onDone();
			});
			break;
		default:
			console.log('Got server info error: ' + res.statusCode);
			res.on('data', function (data) {}); // always consume data trunk
			onDone(false);
			break;
		}
	}).on('error', function(e) {
		console.log("Failed to send HTTP request, error: " + e.message);
		onDone(false);
	});
}

/**
 * Detect whether network profile is established
 */
function isProfileReady(onDone) {
	// ToDo: implement later
	var isProfileRegistered = false;
	if (isProfileRegistered) {
		onDone(true);
	} else {
		onDone();
	}
}


/**
 * Save network profile
 */
function saveProfile(onDone) {
	var http = require('http');
	var helper = require("./helper");
	
	// POST /v1/NetworkProfile/{EndpointID}/{NetworkID}	
	var datastr = JSON.stringify(profile);
	var options = {
			hostname: helper.config.server[0].address,
			port: helper.config.server[0].port,
			path: helper.config.server[0].cms + '/NetworkProfile/' + helper.config.endpoint.id + '/' + 'pseudo',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': datastr.length
			}
		};

	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		//console.log(res.statusCode);
		switch (res.statusCode) {
		case 200:
		case 202:
			console.log('Save network profile to server correctly');
			onDone(true);
			break;
		default:
			console.log('Failed to save network profile, err=' + res.statusCode);
			onDone(false);
			break;
		}
		res.on('data', function (data) {}); // always consume data trunk
	}).on('error', function(e) {
		console.log("Network profile error: " + e.message);
		onDone(false);
	});
	req.write(datastr); // write data to request body
	req.end();
}


var timers = [];
/**
 * Ask secondary server to punch a UDP 'REP_SEND_MSG' message
 * @param callback to notify UDP ack received successfully or not, decided by callback argument
 * @param extPort which router port server shall send UDP to
 * @param useSecondPort whether port configuration shall server send UDP from  
 */
function getUDPTestAck(callback, extPort, useSecondPort) {
	var http = require('http');
	var helper = require("./helper");
	var portId = (useSecondPort) ? 1 : 0;
	var nonce = helper.createGUID();
	var serverId = 1; // secondary server

	// GET /v1/Message/{SocketType}?Nonce={Nonce}&SrcPort={SrcPort}&DestIP={DestIP}&DestPort={DestPort}&Count={Count}
	var path = [
		helper.config.server[0].cms + '/Message/UDP?Nonce=' + nonce,
		'SrcPort=' + helper.config.server[serverId].udp[portId],
		'DestIP=' + profile.Location.ExtIP,
		'DestPort=' + extPort,
		'Count=' + 3 // to-do, hardcode first
	].join('&');
	
	var options = {
			hostname: helper.config.server[serverId].address,
			port: helper.config.server[serverId].port,
			path: path,
			method: 'GET',
		};
	
	var req = http.request(options, function(res) {
		res.on('data', function (data) {}); // always consume data trunk
		switch (res.statusCode) {
		case 200:
		case 202:
			var timer = {ID: null, Nonce: nonce, onReceived: callback};
			timer.ID = setTimeout(function(nonce) {
				// check if nonce matchs any timer
				var t;
				for (var i = 0; i < timers.length; i++) {
					if (timers[i].Nonce === nonce) {
						t = timers[i];
						timers.splice(i, 1); // remove listener
						break; // end loop
					}
				}
				if (t) {
					callback(); // empty argument means timeout
				}
			}, 10*1000, nonce); // timeout in 10 seconds
			timers.push(timer);
			break;
		default:
			console.log('Failed to send HTTP request, error: ' + res.statusCode);
			callback(); // empty argument means error
			break;
		}
	}).on('error', function(e) {
		console.log("Failed to send HTTP request, error: " + e.message);
		// abort session negociation on error
		callback(); // empty argument means error
	});
	req.end();
}

/**
 * Send UDP message to server and wait for PUSH ack
 * @param callback to notify PUSH ack received successfully or not, decided by callback argument
 * @param useSecondServer to use 2nd server configuration or not  
 */
function getExtPortAck(callback, useSecondServer) {
	var helper = require('./helper');
	var constant = require('./constants');
	var serverId = (useSecondServer) ? 1 : 0;
	var nonce = helper.createGUID();
	
	var msg = {
			Type: constant.REQ_GET_EXT_PORT,
			Data: helper.toBytes(helper.config.endpoint.id),
			LocalPort: helper.config.endpoint.port,
			Destination: {
				IP: helper.config.server[serverId].address,
				Port: helper.config.server[serverId].udp[0]
			},
			Nonce: nonce,
			Count: 1
		};
	helper.sendCepsUdpMsg(msg);
	
	var timer = {ID: null, Nonce: nonce, onReceived: callback};
	timer.ID = setTimeout(function(nonce) {
		// check if nonce matchs any timer
		var t;
		for (var i = 0; i < timers.length; i++) {
			if (timers[i].Nonce === nonce) {
				t = timers[i];
				timers.splice(i, 1); // remove listener
				break; // end loop
			}
		}
		if (t) {
			callback(); // empty argument means timeout
		}
	}, 10*1000, nonce); // timeout in 10 seconds
	timers.push(timer);
}


/**
 * Detect whether hole punching is feasible
 */
function isHolePunchAccessible(onDone) {
	var async = require('async');
	var extPort = 0;

	// assume worst case
	profile.UDP.Router.PortChange = true;
	profile.UDP.Router.PortRestricted = true;

	async.series([
		function (onDone) {
			// get external port first
			getExtPortAck(function(msg) {
				if (!msg) {
					// failed to received external UDP status.
					profile.UDP.Blocked = true;
					onDone('timeout');
					return;
				}
				// received callback - a json object as 
				// {Version: 1, Type: constant.CMD_ACK_EXT_PRT, Nonce: msg.Nonce, Port: msg.Remote.port}
				profile.UDP.Blocked = false;
				extPort = msg.Port;
				onDone();
			});
		},
		function (onDone) {
			// ask server to punch in just received port
			getUDPTestAck(function(msg) {
				if (msg) {
					profile.UDP.Router.PortChange = false;
					profile.UDP.Router.PortRestricted = false;
					onDone('success'); // end hole-punch procedure
				} else {
					onDone(); // not received, go next check
				}
			}, extPort);
		},
		function (onDone) {
			// see whether router may change port on different destination 
			getExtPortAck(function(msg) {
				if (!msg) {
					// failed to received external UDP status.
					profile.UDP.Blocked = true;
					onDone('timeout');
					return;
				}
				// received callback - a json object as 
				// {Version: 1, Type: constant.CMD_ACK_EXT_PRT, Nonce: msg.Nonce, Port: msg.Remote.port}
				if (extPort === msg.Port) {
					// not PortChange router
					profile.UDP.Router.PortChange = false;
				} else {
					// is PortChange router
					extPort = msg.Port;
				}
				onDone(); // go next check
			}, true); // use 2nd server configuration
		},
		function (onDone) {
			// ask server to punch in new received port
			getUDPTestAck(function(msg) {
				if (!msg) {
					// failed to received external UDP status.
					profile.UDP.Blocked = true;
					onDone('timeout');
					return;
				}
				onDone(); // received, go next check
			}, extPort);
		},
		function (onDone) {
			// ask server to punch in new received port from another port
			getUDPTestAck(function(msg) {
				if (msg) {
					profile.UDP.Router.PortRestricted = false;
				} else {
					profile.UDP.Router.PortRestricted = true;
				}
				onDone(); // go next check
			}, extPort, true); // use 2nd port configuration
		},
	],
	// done hole punch procedure, continue to next step
	function(err, results) {
		onDone();
	});
}

/**
 * Detect whether UPnP is feasible
 */
function isUPnPAccessible(onDone) {
	// ToDo: implement later
	profile.UDP.UPnP.Enabled = false;
	onDone();
}

/**
 * Check whether the IP is on-use network IP
 * @param myIP
 * @returns
 */
function isPublicIP(myIP) {
	var helper = require("./helper");
	//Compare whether parameter matches any network IP
	var addr = helper.getNetworkIP();
	for (var x in addr) {
		if (x === myIP) {
			return true;
		}
	}
	return false;
}

/**
 * Detect whether endpoint is public accessible
 */
function isPublicAccessible(onDone) {
	var http = require('http');
	var helper = require("./helper");

	if (!isPublicIP(profile.Location.ExtIP)) {
		// not public IP, continue for next check
		profile.UDP.Public = false;
		onDone();
		return;
	}
	
	// ask server to punch in just received port
	getUDPTestAck(function(msg) {
		if (msg) {
			profile.UDP.Blocked = false;
			profile.UDP.Public = true;
			profile.UDP.Router.PortChange = false;
			profile.UDP.Router.PortRestricted = false;
			onDone('success'); // end detection procedure
		} else {
			profile.UDP.Public = false;
			onDone(); // not received, go next check
		}
	}, helper.config.endpoint.udp);
}

/**
 * Register device
 */
function registerDevice(onDone) {
	var http = require('http');
	var helper = require("./helper");

	// Make a HTTP POST request
	// POST /User/{UserID}/{EndpointName}/{EndpointID}
	var path = [
			helper.config.server[0].cms,
			'User',
			helper.config.user.id,
			helper.config.endpoint.name,
			helper.config.endpoint.id
		].join('/');
	
	var options = {
			hostname: helper.config.server[0].address,
			port: helper.config.server[0].port,
			path: path,
			method: 'POST',
		};

	var req = http.request(options);
	req.end();
	onDone();
}

/**
 * Init network profile
 * 
 * @param onDone callback function to send event to when it's done 
 */
exports.init = function () {
	var async = require('async');

	async.series([
		getServerInfo,
		registerDevice,
		isProfileReady,
		isPublicAccessible,
		isUPnPAccessible,
		isHolePunchAccessible,
		saveProfile
	],
	//optional callback
	function(success, results) {
		if (success !== true) {
			// failed, success is a error message
			console.log('Failed to create network profile!');
			process.exit(1);
		} else {
			console.log(results);
			console.log('Network profile is ready, please connect to http://localhost:8000/');
		}
	});
};


/**
 * See if nonce is valid or has been served
 * @param nonce
 */
function isValidNonce(nonce) {
	// to-do implement later
	return true;
}

/**
 * handle HTTP push notification
 * @param json JSON object 
 * @return true if message handled, false for next handler
 */
exports.onPush = function(msg) {
	var constant = require('./constants');
	
	switch (msg.Type) {
	case constant.CMD_ACK_EXT_PRT:
		// check if nonce matchs any timer
		var t;
		for (var i = 0; i < timers.length; i++) {
			if (timers[i].Nonce === msg.Nonce) {
				t = timers[i];
				timers.splice(i, 1); // remove listener
				clearTimeout(t.ID); // remove timer 
				break; // end loop
			}
		}
		if (t && t.onReceived) {
			t.onReceived(msg);
		}
		return true;
	default:
		return false;
	}
};

/**
 * UDP message handler
 * 
 * @param json Received UDP message in JSON 
 * @return true if message handled, false for next handler
 */
exports.onMessage = function(msg) {
	var constant = require("./constants");

	switch (msg.Type) {
	case constant.REP_GET_EXT_PORT:
		// check if nonce matchs any timer
		var t;
		for (var i = 0; i < timers.length; i++) {
			if (timers[i].Nonce === msg.Nonce) {
				t = timers[i];
				timers.splice(i, 1); // remove listener
				clearTimeout(t.ID); // remove timer
				break; // end loop
			}
		}
		if (t && t.onReceived) {
			t.onReceived(msg);
		}
		return true;
	default:
		return false;
	}
};
