export interface ExcelData {
  customer: number;
  customer_name: string;
  menu: number | string;
  menu_name: string;
  price: string;
  path: string | null;
  order_time: string;
  delivered_time: string;
  credit_in: string;
  credit_time: string;
  credit_by: string;
  disposal_time: string;
  disposal_manager: string;
  disposal_in : string;
  master_time: string;
  master_manager: string;
  master_in: string;
  memo: string;
  hex: string;
}