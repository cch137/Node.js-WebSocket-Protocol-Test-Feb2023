const io = (() => {
  const $CONNECT = 'connect';
  const $DISCONNECT = 'disconnect';
  const $ERROR = 'error';
  const $RECONNECT = 'reconnect';
  const $RECONNECTING = 'reconnecting';
  const $RECONNECT_ATTEMPT = 'reconnect_attempt';
  const $RECONNECT_ERROR = 'reconnect_error';
  const $RECONNECT_FAILED = 'reconnect_failed';

  class IO {
    connected = false;
    reconnecting = false;
    reconnectTries = 0;
    handlers = new Map();

    get reserved_events() {
      return [
        $CONNECT,
        $DISCONNECT,
        $ERROR,
        $RECONNECT,
        $RECONNECTING,
        $RECONNECT_ATTEMPT,
        $RECONNECT_ERROR,
        $RECONNECT_FAILED
      ];
    }

    constructor() {
      this.connect();
    }

    callListeners(eventName, eventData) {
      if (this.handlers.has(eventName)) {
        this.handlers.get(eventName).forEach(h => {
          try {
            h(eventData);
          } catch (err) {
            console.error(err);
          }
        });
      }
    }
    
    on(eventName, handler=(event)=>{}) {
      if (!this.handlers.has(eventName)) {
        this.handlers.set(eventName, new Set([handler]));
      } else {
        this.handlers.get(eventName).add(handler);
      }

      if (eventName === $CONNECT) {
        if (this.connected) handler(this.connected);
      }
    }
    
    connect() {
      const self = this;

      if (self.reconnectTries > 1) self.callListeners($RECONNECT_FAILED);
      if (self.reconnecting) self.callListeners($RECONNECT_ATTEMPT);
      const ws = new WebSocket(location.origin.replace(/^https?:\/\//, 'ws://'));

      ws.onopen = (event) => {
        self.connected = event || true;
        if (self.reconnecting) {
          self.callListeners($RECONNECT, event);
          clearInterval(self.reconnecting);
          self.reconnecting = false;
          self.reconnectTries = 0;
        } else {
          self.callListeners($CONNECT, event);
        }
      };

      ws.onmessage = (event) => {
        let eventName = 'message', data = event.data;
        try {
          const packet = JSON.parse(data);
          eventName = packet.event;
          data = packet.data;
        } catch {}
        self.callListeners(eventName, data);
      };

      ws.onerror = (err) => {
        if (self.reconnecting) {
          self.callListeners($RECONNECT_ERROR, err);
        } else {
          self.callListeners($ERROR, err);
        }
      };

      ws.onclose = (event) => {
        self.connected = false;
        if (!self.reconnecting) {
          self.reconnecting = setInterval(() => {
            self.callListeners($RECONNECTING);
          }, 0);
        }
        self.reconnectTries++;
        self.connect();
        self.callListeners($DISCONNECT, event);
      };
      
      delete this.ws;
      this.ws = ws;
    }

    emit(event, data) {
      this.ws.send(JSON.stringify({
        event, data
      }));
    }
  }

  return () => new IO();
})();

(() => {
  const testMessage = (message) => {
    console.log(`%c${message}`, 'color:#fff;background:#00f;font-weight:bold;padding:4px 8px;font-size:14px;');
  };
  let ws = io();
  ws.on('0x0', data => {
    console.log("received 0x0:", data);
  });
  ws.on('0x1', data => {
    console.log("received 0x1:", data);
  });
  ws.on('connect', () => {
    ws.emit('0x1', 'Hi, server!');
    testMessage('CONECTED');
  });
  ws.on('disconnect', () => {
    testMessage('DISCONECTED');
  });
  ws.on('error', () => {
    testMessage('ERROR');
  });
  ws.on('reconnect', () => {
    testMessage('RECONNECT');
  });
  ws.on('reconnecting', () => {
    testMessage('RECONNECTING');
  });
  ws.on('reconnect_attempt', () => {
    testMessage('RECONNECT_ATTEMPT');
  });
  ws.on('reconnect_error', () => {
    testMessage('RECONNECT_ERROR');
  });
  ws.on('reconnect_failed', () => {
    testMessage('RECONNECT_FAIELED');
  });
})();