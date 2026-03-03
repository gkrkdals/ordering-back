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
                         '그릇수거입금'                   menu_name,
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
                         '마스터입금'                          menu_name,
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
                    AND order_code = 0

                    UNION ALL

              SELECT 
                      '적립금사용'                          menu_name,
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
                AND customer_credit.memo = '적립금 사용'
                AND customer = ?

                UNION ALL

              SELECT 
                      '적립금사용취소'                          menu_name,
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
                AND customer_credit.memo = '적립금 사용 취소'
                AND customer = ?

                    ) a

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

  static getCreditHistory = `
      SELECT
        SUM(misu) AS misu,
        SUM(ordered) AS ordered,
        SUM(charged) AS charged,
        SUM(misu) + SUM(ordered) - SUM(charged) AS remaining
      FROM
      (
        -- 1. 기초 미수 (misu)
        SELECT 
          IFNULL(SUM(p.credit_diff), 0) * -1 AS misu,
          0 AS ordered,
          0 AS charged,
          0 AS remaining
        FROM customer_credit p
        LEFT JOIN \`order\` q ON p.order_code = q.id  -- 메뉴 필터를 위해 조인 추가
        WHERE p.customer = ? 
          AND p.time < ?                            -- 시간 조건 수정 (<= 에서 < 로)

        UNION ALL

        -- 2. 당기 주문액 (ordered)
        SELECT
          0 AS misu, 
          IFNULL(SUM(a.price), 0) AS ordered,
          0 AS charged,
          0 AS remaining
        FROM \`order\` a
        LEFT JOIN (
            SELECT order_code, MAX(status) status
            FROM order_status
            GROUP BY order_code
        ) b ON a.id = b.order_code
        WHERE a.customer = ?
          AND (a.time >= ? AND a.time <= ?)         -- BETWEEN 로직 명확화
          AND (b.status != 8 OR b.status IS NULL)   -- 상태값 8 제외 (NULL 처리 포함)

        UNION ALL

        -- 3. 당기 입금액 (charged)
        SELECT
          0 AS misu,
          0 AS ordered, 
          IFNULL(SUM(p.credit_diff), 0) AS charged,
          0 AS remaining
        FROM customer_credit p
        LEFT JOIN \`order\` q ON p.order_code = q.id  -- 메뉴 필터를 위해 조인 추가
        WHERE p.customer = ? 
          AND (p.time >= ? AND p.time <= ?)         -- BETWEEN과 동일
          AND (p.status = 5 OR p.status = 7 OR p.order_code = 0) -- 위 쿼리의 d, e, f 조건 합산
      ) t
  `;
}