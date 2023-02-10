const port = process.env.PORT || 3011;
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const WS = require('./WS');


const app = express();
const server = require('http').createServer(app);
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
require('dotenv').config();
app.disable('x-powered-by');
app.locals.pretty = false;
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, './views/'));
// console.log()
app.use('/static/', express.static(path.join(__dirname, './static/')));

app.get('/', (req, res) => {
  res.render('index');
});

const io = new WS.Server({server});

io.on('connection', ws => {
  console.log('WS CLIENT OPENED');
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
  io.emit('0x0', 'Someone Joined');
});

server.listen(port, () => console.log(`Server is listening to http://localhost:${port}`));