(() => {
  const CONNECT = 'connect';

  class WS {
    connected = false;
    
    _handlers = new Map([
      [CONNECT, new Set()],
      ['disconnect', new Set()],
      ['error', new Set()],
      ['reconnect', new Set()],
      ['reconnect_attempt', new Set()],
      ['reconnecting', new Set()],
      ['reconnect_error', new Set()],
      ['reconnect_failed', new Set()]
    ]);

    handlers = {};

    constructor() {
      this.connect();
    }
    
    on(eventName, handler) {
      if (this._handlers.has(eventName)) {
        if (eventName === CONNECT) {
          if (this.connected) handler(this.connected);
        }
        return this._handlers.get(eventName).add(handler);
      }
      let eventHandlerSet = this.handlers[eventName];
      if (!eventHandlerSet) {
        eventHandlerSet = new Set();
        this.handlers[eventName] = eventHandlerSet;
      }
      eventHandlerSet.add(handler);
    }
    
    connect() {
      const self = this;

      const ws = new WebSocket(location.origin.replace(/^https?:\/\//, 'ws://'));

      ws.onopen = (event) => {
        self.connected = event || true;
        self._handlers.get(CONNECT).forEach(h => h(event));
      };

      ws.onmessage = (event) => {
        let eventName = 'message', data = event.data;
        try {
          const packet = JSON.parse(data);
          eventName = packet.event;
          data = packet.data;
        } catch {}
        const handlerSet = self.handlers[eventName];
        if (handlerSet) handlerSet.forEach(h => h(data));
      };

      ws.onerror = (error) => {
        console.log('WS Error:', error);
      };

      ws.onclose = (event) => {
        self.connected = false;
        console.log('WS connection closed');
        self.connect();
      };
      
      delete this.ws;
      this.ws = ws;
    }

    emit(event, data) {
      console.log('sent', event, data);
      this.ws.send(JSON.stringify({
        event, data
      }));
    }
  }
  var socket = new WS();   
  socket.on('0x0', data => {
    console.log("received 0x0:", data);
  });
  socket.on('0x1', data => {
    console.log("received 0x1:", data);
  });
  socket.on(CONNECT, () => {
    console.log('CONECTED');
    socket.emit('0x1', 'Hi, server!');
  });
})();