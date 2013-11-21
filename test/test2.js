/*
var os=require('os');
var ifaces=os.networkInterfaces();
for (var dev in ifaces) {
  var alias=0;
  ifaces[dev].forEach(function(details){
    if (details.family=='IPv4') {
      console.log(dev+(alias?':'+alias:''),details.address);
      ++alias;
    }
  });
}
*/

function isPublicIP(myIP) {
	var os = require('os');
	var ifaces = os.networkInterfaces();
	var isMatched = false;
	for (var x in ifaces) {
		ifaces[x].forEach(function(details) {
			if (details.family === 'IPv4' && details.address === myIP) {
				isMatched = true;
			}
		});
	}
	return isMatched;
}

console.log(isPublicIP('127.0.0.2'));