function toBytes(str) {
	var bytes = new Buffer(str.length / 2);
	for (var i = 0; i < str.length; i += 2) {
		bytes[i/2] = parseInt(str.substr(i, 2), 16);
	}
	return bytes;
}

function toString(bytes) {
	var hex = [];
	for (var i=0; i<bytes.length; i++) {
		var b = '00'+bytes[i].toString(16);
		console.log(b);
		hex.push(b);
	}
	return hex.join('');
}

function to2(bytes) {
	var hex = [];
	for (var i=0; i<bytes.length; i++) {
		var b =('00'+bytes[i].toString(16)).substr(-2,2);
		hex.push(b);
	}
	return hex.join('');
}


var str = "0c054070203b933f4f56f930dc70c7bf";
var bytes = toBytes(str);
console.log(bytes);
console.log(toString(bytes));
console.log(to2(bytes));
