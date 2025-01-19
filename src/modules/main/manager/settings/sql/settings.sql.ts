export class SettingsSql {

  static getOrdinaryData = `
      SELECT *
      FROM (SELECT t.customer,
                   t.customer_name,
                   t.menu,
                   t.menu_name,
                   IFNULL(u.nickname, '')   AS                                              path,
                   IFNULL(t.price, 0)       AS                                              price,
                   IFNULL(t.order_time, '') AS                                              order_time,
                   IF(cancelled.status = 8, cancelled.time, delivered.time)                 delivered_time,
                   IF(cancelled.status = 8, cancelled_by.nickname, delivered_user.nickname) credit_by,
                   cc.credit_time           AS                                              credit_time,
                   IFNULL(cc.credit_in, 0)  AS                                              credit_in,
                   IF(cancelled.status = 8, '취소됨', '')                                      memo,
                   t.hex
            FROM (SELECT a.id   order_code,
                         a.customer,
                         b.name customer_name,
                         a.menu,
                         a.path,
                         c.name menu_name,
                         a.price,
                         time   order_time,
                         d.hex
                  FROM \`order\` a,
                       customer b,
                       menu c,
                       customer_category d
                  WHERE b.id = a.customer
                    AND c.id = a.menu
                    AND d.id = b.category) t
                     LEFT JOIN order_status cancelled
                               ON cancelled.status = 8 AND cancelled.order_code = t.order_code
                     LEFT JOIN user cancelled_by ON cancelled.\`by\` = cancelled_by.id
                     LEFT JOIN order_status delivered
                               ON delivered.status = 5 AND delivered.order_code = t.order_code
                     LEFT JOIN user u ON t.path = u.id
                     LEFT JOIN user delivered_user ON delivered.by = delivered_user.id
                     LEFT JOIN (SELECT customer_credit.order_code,
                                       user.nickname               \`by\`,
                                       customer_credit.time        credit_time,
                                       customer_credit.credit_diff credit_in
                                FROM customer_credit
                                         LEFT JOIN user ON customer_credit.\`by\` = user.id
                                WHERE status = 5) cc ON t.order_code = cc.order_code
            WHERE t.order_time >= ?
              AND t.order_time <= ?
              AND (t.customer = ? OR ISNULL(?))
              AND (t.menu = ? OR ISNULL(?))

            UNION ALL

            SELECT *
            FROM (SELECT customer.id          customer,
                         customer.name        customer_name,
                         ''                   menu,
                         ''                   menu_name,
                         null                 path,
                         null                 price,
                         null                 order_time,
                         customer_credit.time delivered_time,
                         user.nickname        credit_by,
                         customer_credit.time credit_time,
                         credit_diff          credit_in,
                         '그릇수거 입금'            memo,
                         hex
                  FROM customer_credit
                           LEFT JOIN user on customer_credit.by = user.id
                           LEFT JOIN customer on customer_credit.customer = customer.id
                           LEFT JOIN customer_category on customer.category = customer_category.id
                  WHERE status = 7
                    AND credit_diff > 0
                    AND (customer_credit.time >= ? AND customer_credit.time <= ?)
                    AND (customer = ? OR ISNULL(?))

                  UNION ALL

                  SELECT customer.id                 customer,
                         customer.name               customer_name,
                         ''                          menu,
                         ''                          menu_name,
                         null                        path,
                         null                        price,
                         null                        order_time,
                         customer_credit.time        delivered_time,
                         user.nickname               credit_by,
                         customer_credit.time        credit_time,
                         customer_credit.credit_diff credit_in,
                         '마스터 입금'                    memo,
                         hex
                  from customer_credit
                           LEFT JOIN user ON customer_credit.\`by\` = user.id
                           LEFT JOIN customer ON customer_credit.customer = customer.id
                           LEFT JOIN customer_category on customer.category = customer_category.id
                  WHERE (customer_credit.time >= ? AND customer_credit.time <= ?)
                    AND (customer = ? OR ISNULL(?))
                    AND order_code = 0) a) p
      ORDER BY p.delivered_time
  `;

  static getAllCustomerOrderData = `
      SELECT a.id,
             a.name,
             a.tel,
             IFNULL(b.cnt, 0)                               AS                         cnt,
             IFNULL(b.price, 0)                             AS                         price,
             (IFNULL(c.misu, 0) - IFNULL(d.deposit_amt, 0)) AS                         misu,
             IFNULL(d.deposit_amt, 0)                       AS                         deposit_amt,
             (IFNULL(b.price, 0) + IFNULL(c.misu, 0) - (IFNULL(d.deposit_amt, 0) * 2)) sum,
             IFNULL(e.total_credit, 0) * -1                 AS                         total_credit,
             ''                                                                        bigo,
             f.hex
      FROM customer a
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
                          GROUP BY customer, status) b ON b.customer = a.id
               LEFT JOIN (SELECT p.customer,
                                 SUM(credit_diff) * -1 misu
                          FROM customer_credit p
                                   LEFT JOIN \`order\` q on p.order_code = q.id
                          WHERE p.time < ?
                            AND (ISNULL(?) OR q.menu = ?)
                          GROUP BY customer) c ON c.customer = a.id
               LEFT JOIN (SELECT p.customer,
                                 SUM(credit_diff) deposit_amt
                          FROM customer_credit p
                                   LEFT JOIN \`order\` q on p.order_code = q.id
                          WHERE p.time >= ?
                            AND p.time <= ?
                            AND (ISNULL(?) OR q.menu = ?)
                            AND p.credit_diff > 0
                          GROUP BY customer) d ON d.customer = a.id
               LEFT JOIN (SELECT customer,
                                 SUM(credit_diff) total_credit
                          FROM customer_credit
                          GROUP BY customer) e ON e.customer = a.id
               LEFT JOIN customer_category f ON f.id = a.category
  `;

  static getEachCustomerOrderData = `
    SELECT
        b.name customer_nm,
        c.name menu_nm,
        a.price,
        a.time,
        IF(ISNULL(a.path), b.name, d.nickname) AS path,
        e.hex
    FROM
        \`order\` a
    LEFT JOIN customer b ON b.id = a.customer
    LEFT JOIN menu c ON c.id = a.menu
    LEFT JOIN user d ON d.id = a.path
    LEFT JOIN customer_category e ON e.id = b.category
    WHERE (a.time >= ? AND a.time <= ?)
    AND   (ISNULL(?) OR a.menu = ?)
    AND   a.customer = ?
  `;

  static getEachCustomerSummaryData = this.getAllCustomerOrderData + ` WHERE a.id = ?`
}