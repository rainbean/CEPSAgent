var buf = new Buffer(3);
buf.fill(0x00);
buf[0] = 1;
buf[1] = 2;
buf[2] = 3;

var buf2 = new Buffer(3);
buf2.fill(0x00);
buf2[0] = 4;
buf2[1] = 5;
buf2[2] = 6;

buf = Buffer.concat([buf, buf2]);
console.log(buf.length);
console.log(buf);
