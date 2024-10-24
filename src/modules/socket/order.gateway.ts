import {
  OnGatewayConnection, OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { Cron, CronExpression } from "@nestjs/schedule";

@WebSocketGateway(8080, {
    cors: ['http://localhost:5173', 'https://localhost', 'https://yeonsu.kr']
})
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

  clearAlarm() {
    this.broadcastEvent('clear_alarm');
  }

  // 새로운 주문 건 알림
  newOrder() {
    this.broadcastEvent('new_order');
  }

  cookingStarted() {
    this.broadcastEvent('cooking_started');
  }

  // 조리시간 초과 알림
  cookingExceeded() {
    this.broadcastEvent('cooking_exceeded');
  }

  // 새로운 픽업요청 알림
  newDelivery() {
    this.broadcastEvent('new_delivery');
  }

  // 배달 지연 알림
  deliverDelayed() {
    this.broadcastEvent('deliver_delayed');
  }

  // 그릇 수거 요청
  newDishDisposal() {
    this.broadcastEvent('new_dish_disposal');
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  ping() {
    this.broadcastEvent('ping');
  }
}