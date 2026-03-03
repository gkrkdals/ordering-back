export class SettingsSql {

  static getOrdinaryData = `
      SELECT 
          *
      FROM (
            -- 일반 주문 데이터
            SELECT t.customer,
                   t.customer_name,
                   t.menu,
                   t.menu_name,
                   IFNULL(u.nickname, '')                   AS                              path,
                   IF(cancelled.status = 8, '취소됨', t.price) AS                              price,
                   IFNULL(t.order_time, '')                 AS                              order_time,
                   IF(cancelled.status = 8, cancelled.time, delivered.time)                 delivered_time,
                   IF(cancelled.status = 8, cancelled_by.nickname, delivered_user.nickname) credit_by,
                   cc.credit_time                           AS                              credit_time,
                   IFNULL(cc.credit_in, 0)                  AS                              credit_in,
                   disposal.time                            AS                              disposal_time,
                   disposal.disposal_manager,
                   cred.credit_diff                         AS                              disposal_in,
                   null                                     AS                              master_time,
                   null                                     AS                              master_manager,
                   null                                     AS                              master_in,
                   IFNULL(t.request, '')                                                                memo,
                   t.hex,
                   IFNULL(t.memo, '') AS bigo,
                   ph.created_at AS point_time,
                   ph.amount AS point_amt,
                   ph.path_type AS point_type
            FROM (SELECT a.id   order_code,
                         a.customer,
                         b.name customer_name,
                         a.menu,
                         a.path,
                         c.name menu_name,
                         a.price,
                         time   order_time,
                         a.request,
                         d.hex, 
                         a.memo
                  FROM \`order\` a
                           LEFT JOIN customer b ON b.id = a.customer
                           LEFT JOIN menu c ON c.id = a.menu
                           LEFT JOIN customer_category d ON d.id = b.category) t
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
                                WHERE status = 5
                                GROUP BY order_code, status) cc ON t.order_code = cc.order_code
                     LEFT JOIN (SELECT o.time,
                                       u.nickname as disposal_manager,
                                       order_code
                                FROM order_status o
                                         LEFT JOIN user u ON u.id = o.\`by\`
                                WHERE status = 7) disposal
                               ON t.order_code = disposal.order_code
                     LEFT JOIN customer_credit cred ON cred.status = 7 AND cred.order_code = t.order_code
                     LEFT JOIN point_history ph ON ph.order_id = t.order_code AND ph.path_type = 'MENU'
            WHERE t.order_time >= ?
              AND t.order_time <= ?
              AND (t.customer = ? OR ISNULL(?))
              AND (t.menu = ? OR ISNULL(?))

            UNION ALL

            -- 그릇수거 데이터
            SELECT *
            FROM (SELECT customer.id             customer,
                         customer.name           customer_name,
                         ''                      menu,
                         ''                      menu_name,
                         null                    path,
                         null                    price,
                         null                    order_time,
                         null                    delivered_time,
                         null                    credit_by,
                         null                    credit_time,
                         null                    credit_in,
                         customer_credit.time AS disposal_time,
                         user.nickname        as disposal_manager,
                         credit_diff          AS disposal_in,
                         null                 AS master_time,
                         null                 AS master_manager,
                         null                 AS master_in,
                         ''                      memo,
                         hex,
                         '' bigo,
                          null point_time,
                          null point_amt,
                          null point_type

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
                         null                        delivered_time,
                         null                        credit_by,
                         null                        credit_time,
                         null                        credit_in,
                         null                 AS     disposal_time,
                         null                 AS     disposal_manager,
                         null                 AS     disposal_in,
                         customer_credit.time AS     master_time,
                         user.nickname        AS     master_manager,
                         customer_credit.credit_diff master_in,
                         ''                          memo,
                         hex,
                         customer_credit.memo bigo,
                         point_history.created_at point_time,
                          point_history.amount point_amt,
                          point_history.path_type point_type
                          
                  from customer_credit
                           LEFT JOIN user ON customer_credit.\`by\` = user.id
                           LEFT JOIN customer ON customer_credit.customer = customer.id
                           LEFT JOIN customer_category on customer.category = customer_category.id
                           LEFT JOIN point_history ON point_history.customer_id = customer.id AND point_history.path_type = 'BOWL'

                  WHERE (customer_credit.time >= ? AND customer_credit.time <= ?)
                    AND (customer = ? OR ISNULL(?))
                    AND order_code = 0) a

            UNION ALL

            -- 마스터입금 데이터
            SELECT d.id          customer,
                   d.name        customer_name,
                   ''            menu,
                   ''            menu_name,
                   null          path,
                   null          price,
                   null          order_time,
                   null          delivered_time,
                   null          credit_by,
                   null          credit_time,
                   null          credit_in,
                   null AS       disposal_time,
                   null AS       disposal_manager,
                   null          disposal_in,
                   a.time        master_time,
                   c.nickname    master_manager,
                   a.credit_diff master_in,
                   ''            memo,
                   hex,
                   a.memo bigo,
                   null point_time,
                    null point_amt,
                    null point_type

            FROM customer_credit a
                     LEFT JOIN \`order\` b ON a.order_code = b.id
                     LEFT JOIN user c ON a.\`by\` = c.id
                     LEFT JOIN customer d ON a.customer = d.id
                     LEFT JOIN customer_category on d.category = c.id
            WHERE (a.time >= ? AND a.time <= ?)
              AND (b.time < ?)
              AND (a.customer = ? OR ISNULL(?))
              AND (status = 5 or status IS NULL)
              
            UNION ALL

            -- 적립금 사용 데이터
            SELECT d.id          customer,
                   d.name        customer_name,
                   ''            menu,
                   ''            menu_name,
                   null          path,
                   null          price,
                   null          order_time,
                   null          delivered_time,
                   null          credit_by,
                   null         credit_time,
                   null          credit_in,
                   null AS       disposal_time,
                   null AS       disposal_manager,
                   null          disposal_in,
                   a.created_at        master_time,
                   null          master_manager,
                   a.amount      master_in,
                   '저억리입그음'            memo,
                   hex,
                   a.path_type bigo,
                   a.created_at point_time,
                   a.amount * 100 point_amt,
                   a.path_type point_type
            FROM point_history a
                 LEFT JOIN customer d ON a.customer_id = d.id
                 LEFT JOIN customer_category on d.category = customer_category.id
            WHERE (a.created_at >= ? AND a.created_at <= ?)
              AND (a.customer_id = ? OR ISNULL(?))
              AND (a.path_type = 'USE' OR a.path_type = 'CANCELED')
              ) p

            
      ORDER BY p.delivered_time
  `;

  static getAllCustomerOrderData = `
      SELECT a.id,
             a.name,
             a.tel,
             IFNULL(b.cnt, 0)                                                               AS  cnt,
             IFNULL(b.price, 0)                                                             AS  price,
             IFNULL(c.misu, 0)                                                              AS  misu,
             IFNULL(d.deposit_amt, 0) + IFNULL(e.deposit_amt, 0) + IFNULL(f.deposit_amt, 0) AS  deposit_amt,
             (IFNULL(b.price, 0) + IFNULL(c.misu, 0) -
              (IFNULL(d.deposit_amt, 0) + IFNULL(e.deposit_amt, 0) + IFNULL(f.deposit_amt, 0))) sum,
             IFNULL(g.total_credit, 0) * -1                                                 AS  total_credit,
             -- 👇 적립금 데이터 추가
             IFNULL(points.earned_point, 0)                                                 AS  earned_point,
             IFNULL(points.used_point, 0)                                                   AS  used_point,
             IFNULL(a.point_balance, 0) * 100                                               AS  point_balance,
             ''                                                                                 bigo,
             h.hex
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
                          WHERE (p.time >= ? AND p.time <= ?)
                            AND (ISNULL(?) OR q.menu = ?)
                            AND p.status = 5
                          GROUP BY customer) d ON d.customer = a.id
               LEFT JOIN (SELECT p.customer,
                                 SUM(credit_diff) deposit_amt
                          FROM customer_credit p
                                   LEFT JOIN \`order\` q on p.order_code = q.id
                          WHERE (p.time >= ? AND p.time <= ?)
                            AND (ISNULL(?) OR q.menu = ?)
                            AND p.status = 7
                          GROUP BY customer) e ON e.customer = a.id
               LEFT JOIN (SELECT p.customer,
                                 SUM(credit_diff) deposit_amt
                          FROM customer_credit p
                                   LEFT JOIN \`order\` q on p.order_code = q.id
                          WHERE (p.time >= ? AND p.time <= ?)
                            AND (ISNULL(?) OR q.menu = ?)
                            AND p.order_code = 0
                          GROUP BY customer) f ON f.customer = a.id
               LEFT JOIN (SELECT customer,
                                 SUM(credit_diff) total_credit
                          FROM customer_credit
                          GROUP BY customer) g ON g.customer = a.id
                          -- 👇 적립금 집계 서브쿼리 추가
               LEFT JOIN (
                  SELECT customer_id,
                         SUM(IF(path_type = 'USE' OR path_type = 'CANCELED', amount, 0)) * -100 as used_point,
                         SUM(IF(path_type != 'USE' AND path_type != 'CANCELED', amount, 0)) * 100 as earned_point
                  FROM point_history
                  WHERE created_at >= ? AND created_at <= ?
                  GROUP BY customer_id
               ) points ON points.customer_id = a.id
                
               LEFT JOIN customer_category h ON h.id = a.category
  `;

  static getMisu = `
      SELECT 
             SUM(credit_diff) * -1 misu
      FROM customer_credit p
                LEFT JOIN \`order\` q on p.order_code = q.id
      WHERE p.time < ?
        AND (ISNULL(?) OR q.menu = ?)
  `;

  static getTotalCredit = `
      SELECT SUM(credit_diff) * -1 AS total_credit FROM customer_credit`;

  static getTotalPoint = `
      SELECT SUM(point_balance) AS total_point FROM customer`;
}