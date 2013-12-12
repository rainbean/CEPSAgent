/**
 * Get server info
 * 
 * @param onDone callback function to send event to when it's done 
 */
function serverInfo(onDone) {
	var http = require('http');
	var helper = require("./helper");
	
	var url = 'http://' + helper.config.server.address + helper.config.server.cms + '/ServerInfo/';
	http.get(url, function(res) {
		switch (res.statusCode) {
		case 200:
			res.on('data', function(chunk) {
				helper.serverinfo = JSON.parse(chunk);
				//console.log(helper.serverinfo);
				onDone();
			});
			break;
		default:
			console.log('Got server info error: ' + res.statusCode);
			res.on('data', function (data) {}); // always consume data trunk
			break;
		}
	}).on('error', function(e) {
		console.log("Failed to send HTTP request, error: " + e.message);
	});
}

/**
 * Detect whether network profile is established
 */
function isProfileReady() {
	// ToDo: implement later
	return false;
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
 * See if nonce is valid or has been served
 * @param nonce
 */
function isValidNonce(nonce) {
	// to-do implement later
	return true;
}


/**
 * Save network profile
 */
function saveProfile() {
	var http = require('http');
	var helper = require("./helper");
	
	// ToDo: handle multiple ip case 
	var addr = helper.getNetworkIP();
	
	// Make a HTTP POST request
	// POST /v1/NetworkProfile/{EndpointID}/{NetworkID}
	var data = {Version:1,
			UDP:{Blocked:false, Public:false, UPnP:{Enabled:false},
				Router:{PortChange:true, PortRestricted:true}},
			Location:{ExtIP:helper.serverinfo.requestor.IP,
				LocalIP:addr[0],
				LocalUDPPort:helper.config.endpoint.udp}};
	var datastr = JSON.stringify(data);
	
	var options = {
			hostname: helper.config.server.address,
			port: helper.config.server.port,
			path: helper.config.server.cms + '/NetworkProfile/' + helper.config.endpoint.id + '/' + 'pseudo',
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
			console.log('Please connect to http://localhost:8000/');
			break;
		default:
			console.log('Failed to save network profile, err=' + res.statusCode);
			break;
		}
		res.on('data', function (data) {}); // always consume data trunk
	}).on('error', function(e) {
		console.log("Network profile error: " + e.message);
	});
	req.write(datastr); // write data to request body
	req.end();
}

/**
 * Detect whether hole punching is feasible
 */
function getExtPortAsync() {
	var helper = require('./helper');
	var constant = require('./constants');
	
	var msg = {
			Type: constant.REQ_GET_EXT_PORT,
			Data: helper.toBytes(helper.config.endpoint.id),
			LocalPort: helper.config.endpoint.port,
			Destination: {
				IP: helper.serverinfo.cms[0].Host,
				Port: helper.serverinfo.cms[0].Port[0]
			},
			Nonce: helper.createGUID(),
			Count: 1
		};

	//console.log(msg);
	
	helper.sendCepsUdpMsg(msg);
	// wait for state machine in onPush()
}


/**
 * Detect whether hole punching is feasible
 */
function isHolePunchAccessible(onDone) {
	// Get external port
	getExtPortAsync();
	
	// wait for state machine in onPush()
}

/**
 * Detect whether UPnP is feasible
 */
function isUPnPAccessible(onDone) {
	// ToDo: implement later, always failed now
	return isHolePunchAccessible(onDone);

}


/**
 * Detect whether endpoint is public accessible
 */
function isPublicAccessible(onDone) {
	var http = require('http');
	var helper = require("./helper");
	
	if (!isPublicIP(helper.serverinfo.requestor.IP)) {
		// not public IP, go next check
		return isUPnPAccessible(onDone);
	}
	
	// ask server to check whether UDP is reachable
	// GET /v1/Message/{SocketType}?Nonce={Nonce}&SrcPort={SrcPort}&DestIP={DestIP}&DestPort={DestPort}&Count={Count}
	var url = [
		'http://' + helper.config.server.address + helper.config.server.cms + '/Message/UDP?Nonce=' + 'rose',
		'SrcPort=' + helper.serverinfo.cms[0].Port[0],
		'DestIP=' + helper.serverinfo.requestor.IP,
		'DestPort=' + helper.config.endpoint.port,
		'Count=10'
	].join('&');
	http.get(url).on('error', function(e) {
		console.log("Failed to send HTTP request, error: " + e.message);
	});
	
	// ToDo: do async check in onUDP() to invoke onDone 

}

/**
 * Register device
 */
function registerDevice() {
	var http = require('http');
	var helper = require("./helper");
	
	// Make a HTTP POST request
	// POST /User/{UserID}/{EndpointName}/{EndpointID}
	
	var path = [
			helper.config.server.cms,
			'User',
			helper.config.user.id,
			helper.config.endpoint.name,
			helper.config.endpoint.id
		].join('/');
	
	var options = {
			hostname: helper.config.server.address,
			port: helper.config.server.port,
			path: path,
			method: 'POST',
		};

	var req = http.request(options);
	req.end();
}

/**
 * Init network profile
 * 
 * @param onDone callback function to send event to when it's done 
 */
exports.init = function (onDone) {
	serverInfo(function() {
		registerDevice(); // place holder
		
		// check whether need to create network profile
		if (isProfileReady()) {
			return onDone();
		}
		
		// start to negociate network profile
		// check whether it's public ip
		isPublicAccessible(onDone);
	});
};


/**
 * handle HTTP push notification
 * @param json JSON object 
 * @return true if message handled, false for next handler
 */
exports.onPush = function(msg) {
	var constant = require('./constants');
	
	switch (msg.Type) {
	case constant.CMD_ACK_EXT_PRT:
		// to-do implement later
		// short cut: bypass other network profile detect, and end it upon receiving RepGetExtPort reply
		
		// {Version: 1, Type: constant.CMD_ACK_EXT_PRT, Nonce: nonce, Port: remote.port};
		if (!isValidNonce(msg.Nonce)) {
			return false; // ignore invalid nonce command, either served or error
		}
		saveProfile(); // ready for listen/request connection
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
		return true;
	default:
		return false;
	}
};
