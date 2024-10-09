export class SettingsSql {
  static getExcelData = `
    SELECT t.customer_name,
           t.menu,
           t.menu_name,
           t.price,
           t.order_time,
           delivered.time delivered_time,
           user.nickname                credit_by,
           p.credit_time,
           IFNULL(p.credit, 0)          credit_in,
           IF(st.status = 8, '취소됨', '') memo
    FROM (SELECT a.id   order_code,
                 a.customer,
                 b.name customer_name,
                 a.menu,
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
    LEFT JOIN
        (SELECT SUM(credit_diff) credit,
                order_code,
                MAX(\`by\`) \`by\`,
                MAX(time)        credit_time
         FROM customer_credit
         WHERE credit_diff > 0
         GROUP BY order_code, \`by\`) p
    ON p.order_code = t.order_code
    LEFT JOIN user on p.by = user.id
    WHERE t.order_time >= ?
      AND t.order_time <= ?
      AND (t.customer = ? OR ISNULL(?))
      AND (t.menu = ? OR ISNULL(?))
  `
}