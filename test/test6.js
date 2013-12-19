var net = require('net');
function getNetworkIP(callback) {
  var socket = net.createConnection(80, 'www.google.com');
  socket.on('connect', function() {
    callback(undefined, socket.address().address);
    socket.end();
  });
  socket.on('error', function(e) {
    callback(e, 'error');
  });
}
function test() {
	return getNetworkIP(function (error, ip) {
		console.log(ip);
		if (error) {
			console.log('error:', error);
		}
		return true;
	});
}
console.log(test());
