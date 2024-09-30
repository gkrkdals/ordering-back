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

  clearCookAlarm() {
    this.broadcastEvent('clear_cook_alarm');
  }

  clearRiderAlarm() {
    this.broadcastEvent('clear_rider_alarm');
  }

  // 새로운 주문 건 알림
  newOrderAlarm() {
    this.broadcastEvent('new_order_alarm');
  }

  // 조리시간 초과 알림
  cookExceeded() {
    this.broadcastEvent('cook_exceeded');
  }

  // 새로운 픽업요청 알림
  newDeliveryAlarm() {
    this.broadcastEvent('new_delivery_alarm');
  }

  // 배달 지연 알림
  deliverDelayed() {
    this.broadcastEvent('deliver_delayed');
  }

  // 그릇 수거 요청
  newDishDisposal() {
    this.broadcastEvent('new_dish_disposal');
  }
}