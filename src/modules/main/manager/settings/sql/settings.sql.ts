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
      delivered_user.nickname                credit_by,
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
  LEFT JOIN user delivered_user ON delivered.by = delivered_user.id
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
  `;

  static getMainData = `
    SELECT
        a.id,
        a.name,
        '' tel,
        IFNULL(b.cnt, 0) cnt,
        IFNULL(b.price, 0) price,
        IFNULL(c.misu, 0) misu,
        (IFNULL(b.price, 0) + IFNULL(c.misu, 0)) sum,
        '' deposit_date,
        '' deposit_nm,
        '' deposit_amt,
        '' bigo
    FROM
        customer a
    LEFT JOIN (SELECT customer,
                      status,
                      COUNT(*)   cnt,
                      SUM(price) price
               FROM (SELECT p.*,
                            q.status
                     FROM \`order\` p
                              LEFT JOIN order_status q ON q.order_code = p.id AND q.status = 8) a
               WHERE ISNULL(status)
                 AND (time >= ? AND time <= ?)
                 AND (ISNULL(?) OR menu = ?)
               GROUP BY customer, status
        ) b ON b.customer = a.id
    LEFT JOIN (
        SELECT
            p.customer,
            SUM(credit_diff) * -1 misu
        FROM
            customer_credit p
        LEFT JOIN \`order\` q on p.order_code = q.id
        WHERE p.time >= ? AND p.time <= ?
        AND   (ISNULL(?) OR q.menu = ?)
        GROUP BY
            customer
        ) c ON c.customer = a.id;
  `;

  static getEachCustomerOrderData = `
    SELECT
        b.name customer_nm,
        c.name menu_nm,
        a.price,
        a.time,
        IF(ISNULL(a.path), b.name, d.nickname) path
    FROM
        \`order\` a
    LEFT JOIN customer b ON b.id = a.customer
    LEFT JOIN menu c ON c.id = a.menu
    LEFT JOIN user d ON d.id = a.path
    WHERE (a.time >= ? AND a.time <= ?)
    AND   (ISNULL(?) OR a.menu = ?)
    AND   a.customer = ?
  `
}