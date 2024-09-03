import {
  OnGatewayConnection, OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';

@WebSocketGateway(8080, { cors: ['http://localhost:5173', 'http://34.47.98.56', 'http://yeonsu.kr'] })
export class OrderGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  @WebSocketServer()
  server: Server;

  private clients: Socket[] = [];

  afterInit(server: Server) {
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

  private broadcastEvent(event: string, data?: any) {
    const broadcastingMessage = JSON.stringify(data);
    for (const client of this.clients) {
      client.emit(event, broadcastingMessage);
    }
  }

  refresh() {
    this.broadcastEvent('refresh');
  }

  refreshClient() {
    this.broadcastEvent('refresh_client');
  }

  newEventCook() {
    this.broadcastEvent('new_event_cook');
  }

  newEventRider() {
    this.broadcastEvent('new_event_rider');
  }

  removeEventCook() {
    this.broadcastEvent('remove_event_cook');
  }

  removeEventRider() {
    this.broadcastEvent('remove_event_rider');
  }
}