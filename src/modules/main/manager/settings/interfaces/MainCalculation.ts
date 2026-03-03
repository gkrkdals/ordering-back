export interface MainCalculation {
  id: number;
  name: string;
  tel: string;
  cnt: number;
  price: number;
  misu: number;
  sum: number;
  deposit_amt: string;
  total_credit: number;
  bigo: string;
  hex: string;
  earned_point?: number; // 기간 내 쌓인 적립금
  used_point?: number;   // 기간 내 사용한 적립금
  point_balance?: number; // 고객의 최종 적립금 잔액
}