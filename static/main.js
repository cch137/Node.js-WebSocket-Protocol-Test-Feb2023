// (() => {
  class WS {
    connected = false;
    
    handlers = {};

    constructor() {
      this.connect();
    }
    
    on(eventName, handler) {
      switch (eventName) {
        case 'connection':
          this.onconnection = handler;
          if (this.connected) handler(this.connected);
          break;
        default:
          let eventHandlerSet = this.handlers[eventName];
          if (!eventHandlerSet) {
            eventHandlerSet = new Set();
            this.handlers[eventName] = eventHandlerSet;
          }
          eventHandlerSet.add(handler);
      }
    }
    
    connect() {
      const self = this;

      const ws = new WebSocket(location.origin.replace(/^https?:\/\//, 'ws://'));

      ws.onopen = (event) => {
        self.connected = event || true;
        if (this.onconnection) {
          this.onconnection();
        }
        console.log('WS connection opened');
      };

      ws.onmessage = (event) => {
        let eventName = 'message', data = event.data;
        try {
          const packet = JSON.parse(data);
          eventName = packet.event;
          data = packet.data;
        } catch {}
        const handlerSet = self.handlers[eventName];
        if (handlerSet) handlerSet.forEach(handler => handler(data));
        else console.log('_recevied:', data);
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
  const socket = new WS();   
  socket.on('0x0', data => {
    console.log("received 0x0 event:", data);
  });
  socket.on('connection', () => {
    socket.emit('0x1', 'Hi, server!');
  });
// })();