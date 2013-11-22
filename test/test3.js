var str = "00010203040506070809A0a0ff",
    a = [];

for (var i = 0; i < str.length; i += 2) {
    //a.push("0x" + str.substr(i, 2));
    //a.push(String.fromCharCode(str.substr(i, 2)));
    a.push(parseInt(str.substr(i, 2), 16));
}

console.log(a); // prints the array
console.log(a.join(" ")); // turn the array into a string of hex values
console.log(parseInt(a[1], 16)); // parse a particular hex number to a decimal value
