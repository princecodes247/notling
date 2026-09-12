import type { Plugin } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';

export function yjsSignalingPlugin(): Plugin {
  return {
    name: 'yjs-signaling-plugin',
    configureServer(server) {
      if (!server.httpServer) return;

      const wss = new WebSocketServer({ noServer: true });
      const topics = new Map<string, Set<WebSocket>>();

      function send(conn: WebSocket, message: any) {
        if (conn.readyState === WebSocket.OPEN) {
          try {
            conn.send(JSON.stringify(message));
          } catch {
            // Connection closed or broken
          }
        }
      }

      wss.on('connection', (conn: WebSocket) => {
        conn.on('error', () => {
          // Ignore connection errors/resets silently
        });

        const subscribedTopics = new Set<string>();

        conn.on('message', (rawData: any) => {
          try {
            const message = JSON.parse(rawData.toString());
            if (!message || !message.type) return;

            switch (message.type) {
              case 'subscribe':
                if (Array.isArray(message.topics)) {
                  for (const topic of message.topics) {
                    if (typeof topic === 'string') {
                      let subs = topics.get(topic);
                      if (!subs) {
                        subs = new Set();
                        topics.set(topic, subs);
                      }
                      subs.add(conn);
                      subscribedTopics.add(topic);
                    }
                  }
                }
                break;

              case 'unsubscribe':
                if (Array.isArray(message.topics)) {
                  for (const topic of message.topics) {
                    const subs = topics.get(topic);
                    if (subs) subs.delete(conn);
                  }
                }
                break;

              case 'publish':
                if (message.topic) {
                  const receivers = topics.get(message.topic);
                  if (receivers) {
                    message.clients = receivers.size;
                    for (const receiver of receivers) {
                      if (receiver !== conn) {
                        send(receiver, message);
                      }
                    }
                  }
                }
                break;

              case 'ping':
                send(conn, { type: 'pong' });
                break;
            }
          } catch {
            // ignore malformed frame
          }
        });

        conn.on('close', () => {
          for (const topic of subscribedTopics) {
            const subs = topics.get(topic);
            if (subs) {
              subs.delete(conn);
              if (subs.size === 0) {
                topics.delete(topic);
              }
            }
          }
          subscribedTopics.clear();
        });
      });

      server.httpServer.on('upgrade', (req, socket, head) => {
        socket.on('error', () => {
          // Ignore raw TCP reset on upgrading socket
        });
        const url = req.url || '';
        if (url.startsWith('/y-webrtc-signaling')) {
          wss.handleUpgrade(req, socket as any, head, (ws: any) => {
            wss.emit('connection', ws, req);
          });
        }
      });

      console.log('✅ Yjs WebRTC signaling server attached to Vite HTTP server on /y-webrtc-signaling');
    },
  };
}
