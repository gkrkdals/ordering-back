export interface OrderStatusRaw {
  id: number;
  order_code: number;
  menu: number;
  menu_name: string;
  time: Date;
  customer: number;
  customer_category: number;
  customer_name: string;
  customer_memo: string;
  request: string;
  status: number;
  status_name: string;
  credit: number
  address: string;
  tel: string;
  floor: string;
  memo: string;
  location: string;
}