//////////////////////////////////////////////////
// Array Helper Functions
//////////////////////////////////////////////////
//attach the .contains method to Array's prototype to call it on any array
Array.prototype.contains = function (array, sizediff) {
	// if the other array is a falsy value, return
	if (!array)
		return false;

	// compare lengths - can save a lot of time
	if (this.length <= array.length)
		return false;

	if (sizediff && this.length > array.length + sizediff)
		return false;

	for (var i = 0; i < array.length; i++) {
		if (this.indexOf(array[i]) == -1) {
			return false;
		}
	}
	return true;
}

//attach the .listsub method to Array's prototype to call it on any array
Array.prototype.listsub = function (array, sizediff) {
	// if the other array is a falsy value, return
	if (!array)
		return null;

	var match = [];
	for (var i = 0; i < this.length; i++) {
		if (this[i].contains(array, sizediff)) {
			match.push(this[i]);
		}
	}
	return match;
}

//attach the .joinsub method to Array's prototype to call it on any array
Array.prototype.joinsub = function (array, sizediff) {
	// if the other array is a falsy value, return
	if (!array)
		return null;

	var match = [];
	for (var i = 0; i < this.length; i++) {
		if (this[i].contains(array, sizediff)) {
			for (var j = 0; j < this[i].length; j++) {
				if (array.indexOf(this[i][j]) == -1) {
					match.push(this[i][j]);
				}
			}
		}
	}
	return match;
}

//////////////////////////////////////////////////
// AJAX handler/callback functions
//////////////////////////////////////////////////

var info; // local config
var list; // list of devices

function fnGetList() {
	$.getJSON( "/list", function(data) {
		list = data;
		$('#items-combobox').combobox({
			data:list,
			valueField:'id',
			textField:'name',
			onSelect: fnSelectItemCB
		});
	});
}

function fnGetInfo() {
	$.getJSON( "/info", function(data) {
		info = data;
	});
}

function fnSelectItemCB(item) {
	$.messager.progress({
		title:'Connecting to ' + item.name,
		msg:'Processing, Please Wait ...'
	});
		
	$.getJSON( "/link/" + item.id, function(data) {
		console.log(data);
		// enforce a bit delay to show progress dialog, just for demo
		setTimeout(function() {
			$.messager.progress('close');
		}, 10000);
	});
}

//////////////////////////////////////////////////
// HTML action functions
//////////////////////////////////////////////////


function fnDocumentReadyCB() {
	fnGetInfo();
	fnGetList();
}
