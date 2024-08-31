import {
  OnGatewayConnection, OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

@WebSocketGateway(8080, { cors: 'http://localhost:5173' })
export class OrderGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  private clients: Socket[] = [];

  afterInit(server: Server) {
    console.log('initialized');
    this.server = server;
  }

  handleConnection(client: Socket) {
    this.clients.push(client);
  }

  handleDisconnect(client: Socket) {
    for (let i = 0; i < this.clients.length; i++) {
      if (this.clients.at(i).id === client.id) {
        this.clients.splice(i, 1);
        break;
      }
    }
  }

  broadcast(data?: any) {
    const broadcastingMessage = JSON.stringify(data);
    for (const client of this.clients) {
      client.send(broadcastingMessage);
    }
  }

  broadcastEvent(event: string, data?: any) {
    const broadcastingMessage = JSON.stringify(data);
    for (const client of this.clients) {
      client.emit(event, broadcastingMessage);
    }
  }
}