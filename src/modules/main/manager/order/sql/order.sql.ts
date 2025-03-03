export class OrderSql {
  static getOrderStatus = `
      SELECT t.*,
             crd.credit
      FROM (SELECT b.id,
                   c.id   order_id,
                   a.order_code,
                   d.id   menu,
                   d.name menu_name,
                   c.time,
                   f.id   customer,
                   g.id   customer_category,
                   f.name customer_name,
                   f.memo customer_memo,
                   c.request,
                   a.status,
                   e.name status_name,
                   c.price,
                   f.address,
                   f.tel,
                   f.floor,
                   c.memo,
                   b.location
            FROM (SELECT order_code,
                         MAX(status) status
                  FROM order_status
                  GROUP BY order_code) a,
                 order_status b,
                 \`order\` c,
                 \`menu\` d,
                 \`order_category\` e,
                 \`customer\` f,
                 \`customer_category\` g
            WHERE b.order_code = a.order_code
              AND b.status = a.status
              AND c.id = a.order_code
              AND d.id = c.menu
              AND e.status = a.status
              AND f.id = c.customer
              AND g.id = f.category) t
               LEFT JOIN (SELECT customer, SUM(credit_diff) * -1 credit FROM customer_credit GROUP BY customer) crd
                         ON crd.customer = t.customer
      WHERE (t.customer_name LIKE ?
          OR t.menu_name LIKE ?
          OR t.request LIKE ?
          OR t.status_name LIKE ?
          OR t.price LIKE ?)
        AND (t.status >= ? AND t.status <= ?)
        AND (ISNULL(?) OR (t.time >= ? AND t.time <= ?))
        AND (ISNULL(?) OR (t.status <= ?))
          ^`;

  static getSales = `
      SELECT SUM(price) AS sales
      FROM \`order\` a
               LEFT JOIN (SELECT order_code, MAX(status) status FROM order_status GROUP BY order_code) b
                         ON a.id = b.order_code
      WHERE a.time >= ?
        AND a.time <= ?
        AND b.status != ?
  `;

  static getOrderStatusCount = `
      SELECT COUNT(*) count
      FROM (SELECT a.order_code,
                   d.name menu_name,
                   f.name customer_name,
                   c.request,
                   e.status,
                   e.name status_name,
                   c.price,
                   c.time
            FROM (SELECT order_code,
                         MAX(status) status
                  FROM order_status
                  GROUP BY order_code) a,
                 order_status b,
                 \`order\` c,
                 \`menu\` d,
                 \`order_category\` e,
                 \`customer\` f
            WHERE b.order_code = a.order_code
              AND b.status = a.status
              AND c.id = a.order_code
              AND d.id = c.menu
              AND e.status = a.status
              AND f.id = c.customer) t
      WHERE (t.customer_name LIKE ?
          OR t.menu_name LIKE ?
          OR t.request LIKE ?
          OR t.status_name LIKE ?
          OR t.price LIKE ?)
        AND (t.status >= ? AND t.status <= ?)
        AND (ISNULL(?) OR (t.time >= ? AND t.time <= ?))
        AND (ISNULL(?) OR (t.status = ? OR t.status = ?))`;

  static getRemainingPendingReceipt = `
      SELECT t.*,
             a.time
      FROM (SELECT MAX(status) status, order_code
            FROM order_status
            WHERE time BETWEEN ? AND ?
            GROUP BY order_code) t
               LEFT JOIN order_status a ON a.order_code = t.order_code AND a.status = t.status
      WHERE t.status = ?
      ORDER BY time DESC
  `;

  static getOrderHistory = `
      SELECT *
      FROM (SELECT (SELECT name FROM order_category WHERE status = a.status) status,
                   time
            FROM order_status a
            WHERE order_code = ?

            UNION ALL

            SELECT CONCAT(
                           '메뉴변경: ',
                           (SELECT nickname FROM user WHERE id = a.\`by\`),
                           ' (',
                           (SELECT name FROM menu WHERE id = a.\`from\`),
                           ' -> ',
                           (SELECT name FROM menu WHERE id = a.to),
                           ')'
                   ) status,
                   time
            FROM order_change a
            WHERE order_code = ?) t
      ORDER BY t.time
  `;

  static getOrdersExceeded = `
      SELECT t.*,
             a.time
      FROM (SELECT order_code,
                   MAX(status) AS status
            FROM order_status
            WHERE (time >= ? AND time <= ?)
            GROUP BY order_code) t,
           order_status a
      WHERE a.order_code = t.order_code
        AND a.status = t.status
        AND (((a.time + INTERVAL ? MINUTE) <= ? AND a.status = ?) OR
             ((a.time + INTERVAL ? MINUTE) <= ? AND a.status = ?))
  `;
}