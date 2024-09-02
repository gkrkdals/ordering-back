export class UpdateOrderDto {
  orderId: number;
  newStatus: number;
  paidAmount: number;
  postpaid: boolean;
  menu: number;
  menuName: string;
}