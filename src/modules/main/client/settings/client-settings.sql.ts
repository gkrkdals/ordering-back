export class ClientSettingsSql {
  static getOrderData = `
      SELECT *
      FROM (SELECT 
                   t.menu_name,
                   IF(cancelled.status = 8, 0, t.price) AS                                  price,
                   IFNULL(t.order_time, '')             AS                                  order_time,
                   IFNULL(cc.credit_in, 0)              AS                                  credit_in,
                   IF(cancelled.status = 8, cancelled.time, delivered.time)                 delivered_time,
                   t.hex,
                   IF(cancelled.status = 8, 1, null) cancelled
            FROM (SELECT a.id   order_code,
                         a.customer,
                         b.name customer_name,
                         a.menu,
                         a.path,
                         c.name menu_name,
                         a.price,
                         time   order_time,
                         e.hex
                  FROM \`order\` a
                           LEFT JOIN customer b ON b.id = a.customer
                           LEFT JOIN menu c ON c.id = a.menu
                           LEFT JOIN customer_category d ON d.id = b.category
                           LEFT JOIN menu_category e ON c.category = e.id) t
                     LEFT JOIN order_status cancelled
                               ON cancelled.status = 8 AND cancelled.order_code = t.order_code
                     LEFT JOIN user cancelled_by ON cancelled.\`by\` = cancelled_by.id
                     LEFT JOIN order_status delivered
                               ON delivered.status = 5 AND delivered.order_code = t.order_code
                     LEFT JOIN user u ON t.path = u.id
                     LEFT JOIN user delivered_user ON delivered.by = delivered_user.id
                     LEFT JOIN (SELECT order_code,
                                       MAX(time)        credit_time,
                                       SUM(credit_diff) credit_in
                                FROM customer_credit
                                WHERE status = 5 AND credit_diff > 0
                                GROUP BY order_code, status) cc ON t.order_code = cc.order_code
            WHERE t.order_time >= ?
              AND t.order_time <= ?
              AND t.customer = ?

            UNION ALL

            SELECT *
            FROM (SELECT 
                         ''                   menu_name,
                         ''                 price,
                         ''                 order_time,
                         credit_diff          credit_in,
                         customer_credit.time delivered_time,
                         '' hex,
                         null cancelled
                  FROM customer_credit
                           LEFT JOIN user on customer_credit.by = user.id
                           LEFT JOIN customer on customer_credit.customer = customer.id
                           LEFT JOIN customer_category on customer.category = customer_category.id
                  WHERE status = 7
                    AND credit_diff > 0
                    AND (customer_credit.time >= ? AND customer_credit.time <= ?)
                    AND customer = ?

                  UNION ALL

                  SELECT 
                         ''                          menu_name,
                         ''                        price,
                         ''                        order_time,
                         customer_credit.credit_diff credit_in,
                         customer_credit.time        delivered_time,
                         '' hex,
                         null cancelled
                  from customer_credit
                           LEFT JOIN user ON customer_credit.\`by\` = user.id
                           LEFT JOIN customer ON customer_credit.customer = customer.id
                           LEFT JOIN customer_category on customer.category = customer_category.id
                  WHERE (customer_credit.time >= ? AND customer_credit.time <= ?)
                    AND customer = ?
                    AND order_code = 0) a

            UNION ALL

            SELECT 
                   ''            menu_name,
                   ''          price,
                   ''          order_time,
                   a.time        delivered_time,
                   a.credit_diff credit_in,
                   '' hex,
                   null cancelled
            FROM customer_credit a
                     LEFT JOIN \`order\` b ON a.order_code = b.id
                     LEFT JOIN user c ON a.\`by\` = c.id
                     LEFT JOIN customer d ON a.customer = d.id
                     LEFT JOIN customer_category on d.category = c.id
            WHERE (a.time >= ? AND a.time <= ?)
              AND (b.time < ?)
              AND a.customer = ?
              AND status = 5) p


      ORDER BY p.delivered_time
  `;
}