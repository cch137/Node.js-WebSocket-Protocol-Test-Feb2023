const port = process.env.PORT || 3011;
const express = require('express');
const path = require('path');
const WS = require('./WS');


const app = express();
const server = require('http').createServer(app);
app.use(express.json());
app.disable('x-powered-by');
app.locals.pretty = false;
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, './views/'));
app.use('/static/', express.static(path.join(__dirname, './static/')));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, './static/favicon.ico'));
});

const io = new WS.Server({server});

io.on('connection', function connection(ws) {
  console.log('WS CLIENT OPENED', ws.settled);
  ws.on('0x0', message => {
    console.log('0x0 received: %s', message);
  });
  ws.on('0x1', message => {
    console.log('0x1 received: %s', message);
  });
  ws.on('close', (code, reason) => {
    console.log('WS CLIENT CLOSED:', code, reason.toString());
  });
  ws.emit('0x0', {'a': '0x0 test a', 'b': '0x0 test b'});
  io.emit('0x1', 'Someone Joined');
});

server.listen(port, () => console.log(`Server is listening to http://localhost:${port}`));