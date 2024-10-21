export class SettingsSql {

  static getOrdinaryData = `
  SELECT
      customer_name, menu, menu_name, path, price, order_time, delivered_time, credit_by, credit_time, credit_in, memo
  FROM (
      SELECT t.customer_name,
             t.menu,
             t.menu_name,
             t.path,
             t.price,
             t.order_time,
             delivered.time delivered_time,
             ''                credit_by,
             null         credit_time,
             null         credit_in,
             IF(st.status = 8, '취소됨', '') memo,
             t.order_code
      FROM (SELECT a.id   order_code,
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
  
      WHERE t.order_time >= ?
        AND t.order_time <= ?
        AND (t.customer = ? OR ISNULL(?))
        AND (t.menu = ? OR ISNULL(?))
  
      UNION ALL
  
      SELECT '' customer_name,
             '' menu,
             '' menu_name,
             null path,
             null price,
             null order_time,
             null delivered_time,
             user.nickname credit_by,
             customer_credit.time        credit_time,
             credit_diff credit,
             '' memo,
             order_code
           FROM customer_credit
           LEFT JOIN user on customer_credit.by = user.id
           WHERE credit_diff > 0 AND order_code != 0) tmp
  ORDER BY order_code, credit_time
  `;

  static getExtraData = `
  SELECT
      customer.name customer_name,
      '' menu,
      '' menu_name,
      null path,
      null price,
      null order_time,
      null delivered_time,
      '최고관리자' credit_by,
      customer_credit.time credit_time,
      customer_credit.credit_diff credit_in,
      '최고관리자 입금' memo
  from customer_credit
  LEFT JOIN user ON customer_credit.\`by\` = user.id
  LEFT JOIN customer ON customer_credit.customer = customer.id
  WHERE (customer_credit.time >= ? AND customer_credit.time <= ?)
    AND order_code = 0;
  `
}