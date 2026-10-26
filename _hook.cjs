require('dotenv').config();
const http = require('http');

let deliveries = 0;
http.createServer((req, res) => {
    let chunks = '';
    req.on('data', (c) => { chunks += c; });
    req.on('end', () => {
        deliveries++;
        console.log(`DELIVERY #${deliveries} | event=${req.headers['x-nexlify-event']} | id=${req.headers['x-nexlify-delivery']} | sig=${(req.headers['x-nexlify-signature'] || '').slice(0, 16)}…`);
        console.log('PAYLOAD:', chunks.slice(0, 300));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end('{"received":true}');
    });
}).listen(5999, () => console.log('webhook receiver listening on 5999'));
