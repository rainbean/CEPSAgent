
//Array Helper Functions

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


//AJAX handler/callback functions


var info; // local config
var list; // list of devices

function fnGetList() {
	$.getJSON( "/list", function(data) {
		list = data;
		//console.log(data);
		var options = '<option value=""> -- </option>';
		for (var i = 0; i < data.length; i++) {
			if (info.endpoint.id !== data[i].id) {
				options += '<option value="' + data[i].id + '">' + data[i].name + '</option>';
			}
		}
		$("#items").html(options);
		$("#items").change(fnSelectItemCB);
	}).fail(function( jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		alert("Request Failed: " + err);
		//console.log( "Request Failed: " + err );
	});
}

function fnGetInfo() {
	$.getJSON( "/info", function(data) {
		info = data;
		//console.log(data);
	});
}

function fnSelectItemCB() {
	if ($(this).val() === '') {
		return;
	}
	$.messager.progress({
		title:'Connecting to ' + $('#items :selected').text(),
		msg:'Processing, Please Wait ...'
	});

	$.getJSON("/link/" + $(this).val(), function(data) {
		$.messager.progress('close');
		$('#link').text('Connected');
		$('#container').show();
	}).fail(function(jqXHR) {
		$.messager.progress('close');
		if (jqXHR.status == 200) {
			$('#link').text('Connected');
			$('#container').show();
		} else if (jqXHR.status == 404) {
			$('#link').text('404 Not Found');
		} else {
			$('#link').text('Other non-handled error type, code=' + jqXHR.status);
		}
	});
}


//HTML action functions



function fnDocumentReadyCB() {
	fnGetInfo();
	fnGetList();

	$("#message").keyup(function(event){
		if(event.keyCode == 13){
			var msg = $(this).val();
			$(this).val('');
			$.getJSON("/talk/" + msg);
			var data = $('#log').html();
			$('#log').html(data + '<br> >> ' + msg);
		}
	});
}