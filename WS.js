const WS = require('ws');


const RESERVED_EVENTS = ['close','error','message','open',
  'ping','pong','unexpected-response','upgrade'];

WS.Server.prototype.__emit = WS.Server.prototype.emit;

WS.Server.prototype.emit = function(event, data, callback, ...args) {
  args = [event, data, callback, ...args];
  try {
    if (callback && typeof callback != 'function') throw 'Callback is not a fucntion';
    const message = JSON.stringify({event, data});
    this.clients.forEach(client => {
      if (client.readyState === WS.OPEN) {
        client.send(message);
      }
    });
  } catch {
    this.__emit(...args);
  }
};

WS.prototype.joinedRooms = new Set();
WS.prototype.__on = WS.prototype.on;
WS.prototype.__emit = WS.prototype.emit;
WS.prototype.settled = false;

WS.prototype.emit = function(event, data, callback=(err)=>{}, ...args) {
  args = [event, data, callback, ...args];
  if (typeof callback != 'function') {
    return this.__emit(...args);
  }
  if (this.readyState === WS.OPEN) {
    this.send(JSON.stringify({
      event,
      data
    }), callback);
  }
};

WS.prototype.on = function(eventName, handler) {
  if (RESERVED_EVENTS.includes(eventName)) {
    return this.__on(eventName, handler);
  }
  if (!this.handlers) this.handlers = {};
  let eventHandlerSet = this.handlers[eventName];
  if (!eventHandlerSet) {
    eventHandlerSet = new Set();
    this.handlers[eventName] = eventHandlerSet;
  }
  eventHandlerSet.add(handler);
  if (!this.settled) {
    this.__on('message', (data) => {
      let event = 'message';
      if (data instanceof Buffer) data = data.toString();
      try {
        data = JSON.parse(data);
        event = data.event;
        data = data.data;
      } catch {}
      const handlerSet = this.handlers[event];
      if (handlerSet) handlerSet.forEach(handler => handler(data));
    });
    this.settled = true;
  }
}

class WSRoom {
  constructor(name, key) {
    this.name = name;
    this.key = key;
    this.sockets = new Set();
  }

  addSocket(socket, key) {
    if (this.key && this.key != key) {
      throw new Error('Socket join Room failed: Incorrect key');
    }
    this.sockets.add(socket);
    socket.joinedRooms.add(this);
  }

  removeSocket(socket) {
    this.sockets.delete(socket);
    socket.joinedRooms.delete(this);
  }

  broadcast(data) {
    for (const socket of this.sockets) {
      socket.send(data);
    }
  }
}

WS.Server = class WSServer extends WS.Server {
  constructor(options) {
    super(options);
    this.rooms = {};
  }

  joinRoom(socket, roomName, key) {
    let room = this.rooms[roomName];
    if (!this.rooms[roomName]) {
      room = this.rooms[roomName] = new WSRoom(roomName, key);
    }
    room.addSocket(socket, key);
    return room;
  }

  leaveRoom(socket, roomName) {
    const room = this.rooms[roomName];
    if (room) {
      room.removeSocket(socket);
      if (room.sockets.size === 0) {
        delete this.rooms[roomName];
      }
    }
  }

  broadcastRoom(roomName, data) {
    const room = this.rooms[roomName];
    if (room) {
      room.broadcast(data);
    }
  }
}

module.exports = WS;