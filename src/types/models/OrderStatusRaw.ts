export interface OrderStatusRaw {
  id: number;
  order_code: number;
  menu: number;
  menu_name: string;
  time: Date;
  customer_name: string;
  request: string;
  status: number;
  status_name: string;
  price: number;
  memo: string;
}