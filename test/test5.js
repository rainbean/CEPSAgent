var x = [168, 199, 56, 91, 146, 52, 231, 64, 175, 133, 167, 15, 146, 60, 83, 107];

// reverse first four bytes, and join with following two reversed, joined with following two reversed, joined with rest of the bytes
//x = x.slice(0, 4).reverse().concat(x.slice(4,6).reverse()).concat(x.slice(6,8).reverse()).concat(x.slice(8))

var guid = x.map(function(item) {
    // return hex value with "0" padding
    return ('00'+item.toString(16).toUpperCase()).substr(-2,2);
})

console.log(guid);
