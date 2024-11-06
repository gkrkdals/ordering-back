import {
  OnGatewayConnection, OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer
} from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { Cron, CronExpression } from "@nestjs/schedule";
import { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@WebSocketGateway()
export class OrderGateway implements OnModuleInit, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  constructor(private readonly configService: ConfigService) {}

  @WebSocketServer()
  server: Server;

  private customerClients: Socket[] = [];
  private managerClients: Socket[] = [];
  private printerClients: Socket[] = [];

  onModuleInit() {
    const port = Number(this.configService.get("WS_PORT"));
    const socketOrigin = this.configService.get("ORIGIN");

    this.server.listen(
      port, {
        cors: {
          origin: [ socketOrigin, 'https://localhost' ],
        }
      });
  }

  afterInit(server: Server) {
    this.server = server;
  }

  handleConnection(client: Socket) {
    const role = client.handshake.query.role as string;

    if (role === 'customer') {
      this.customerClients.push(client);
    } else if (role === 'manager') {
      this.managerClients.push(client);
    } else if (role === 'printer') {
      this.printerClients.push(client);
    }
  }

  handleDisconnect(client: Socket) {
    this.customerClients = this.customerClients.filter((socket: Socket) => socket.id !== client.id);
    this.managerClients = this.managerClients.filter((socket: Socket) => socket.id !== client.id);
    this.printerClients = this.printerClients.filter((socket: Socket) => socket.id !== client.id);
  }

  refresh() {
    this.broadcastManagerEvent('refresh');
  }

  refreshClient() {
    this.broadcastCustomerEvent('refresh_client');
  }

  clearAlarm() {
    this.broadcastManagerEvent('clear_alarm');
  }

  // 새로운 주문 건 알림
  newOrder(data?: any) {
    this.broadcastManagerEvent('new_order', data);
  }

  // 조리 시작됨
  cookingStarted(data?: any) {
    this.broadcastManagerEvent('cooking_started', data);
  }

  // 조리시간 초과 알림
  cookingExceeded(data?: any) {
    this.broadcastManagerEvent('cooking_exceeded', data);
  }

  // 새로운 픽업요청 알림
  newDelivery(data?: any) {
    this.broadcastManagerEvent('new_delivery', data);
  }

  // 배달 지연 알림
  deliverDelayed(data?: any) {
    this.broadcastManagerEvent('deliver_delayed', data);
  }

  // 그릇 수거 요청
  newDishDisposal(data?: any) {
    this.broadcastManagerEvent('new_dish_disposal', data);
  }

  // 인쇄 요청
  printReceipt(data?: any) {
    this.broadcastPrinterEvent('print_receipt', data);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  ping() {
    this.broadcastCustomerEvent('ping');
    this.broadcastManagerEvent('ping');
    this.broadcastPrinterEvent('ping');
  }

  @Cron("0 0 05 * * *")
  cleanup() {
    console.log("cleaning up clients at 5am");
    this.customerClients = [];
    this.managerClients = [];
    this.printerClients = [];
  }

  private broadcastCustomerEvent(event: string, data?: any) {
    for (const client of this.customerClients) {
      client.emit(event, data);
    }
  }

  private broadcastManagerEvent(event: string, data?: any) {
    for (const client of this.managerClients) {
      client.emit(event, data);
    }
  }

  private broadcastPrinterEvent(event: string, data?: any) {
    for (const client of this.printerClients) {
      client.emit(event, data);
    }
  }
}