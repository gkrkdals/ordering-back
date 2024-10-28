export class SettingsSql {

  static getOrdinaryData = `
  SELECT
      t.customer,
      t.customer_name,
      t.menu,
      t.menu_name,
      u.nickname path,
      t.price,
      t.order_time,
      delivered.time delivered_time,
      cc.\`by\`                credit_by,
      cc.credit_time         credit_time,
      cc.credit_in           credit_in,
      IF(st.status = 8, '취소됨', '') memo
  FROM (
      SELECT
          a.id   order_code,
          a.customer,
          b.name customer_name,
          a.menu,
          a.path,
          c.name menu_name,
          a.price,
          time order_time
      FROM
          \`order\` a,
           customer b,
           menu c
      WHERE b.id = a.customer
        AND c.id = a.menu) t
  LEFT JOIN order_status st ON st.status = 8 AND st.order_code = t.order_code
  LEFT JOIN order_status delivered ON delivered.status = 5 AND delivered.order_code = t.order_code
  LEFT JOIN user u ON t.path = u.id
  LEFT JOIN (
    SELECT
        customer_credit.order_code,
        user.nickname \`by\`,
        customer_credit.time credit_time,
        customer_credit.credit_diff credit_in
    FROM customer_credit
    LEFT JOIN user ON customer_credit.\`by\` = user.id
    WHERE status = 5
  ) cc ON t.order_code = cc.order_code
  WHERE t.order_time >= ?
  AND t.order_time <= ?
  AND (t.customer = ? OR ISNULL(?))
  AND (t.menu = ? OR ISNULL(?));
  `;

  static getDishData = `
  SELECT 
         customer.id customer,
         customer.name customer_name,
         '' menu,
         '' menu_name,
         null path,
         null price,
         null order_time,
         null delivered_time,
         user.nickname credit_by,
         customer_credit.time        credit_time,
         credit_diff credit_in,
         '그릇수거 입금' memo
       FROM customer_credit
       LEFT JOIN user on customer_credit.by = user.id
       LEFT JOIN customer on customer_credit.customer = customer.id
       WHERE status = 7 AND credit_diff > 0
         AND (customer_credit.time >= ? AND customer_credit.time <= ?)
         AND (customer = ? OR ISNULL(?))
  `;

  static getExtraData = `
  SELECT
      customer.id customer,
      customer.name customer_name,
      '' menu,
      '' menu_name,
      null path,
      null price,
      null order_time,
      null delivered_time,
      '마스터' credit_by,
      customer_credit.time credit_time,
      customer_credit.credit_diff credit_in,
      '마스터 입금' memo
  from customer_credit
  LEFT JOIN user ON customer_credit.\`by\` = user.id
  LEFT JOIN customer ON customer_credit.customer = customer.id
  WHERE (customer_credit.time >= ? AND customer_credit.time <= ?)
    AND (customer = ? OR ISNULL(?))
    AND order_code = 0;
  `
}