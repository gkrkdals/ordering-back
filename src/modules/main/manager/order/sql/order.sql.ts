export class OrderSql {
  static getOrderStatus = `
      SELECT
          *
      FROM
          (
              SELECT
                 b.id,
                 a.order_code,
                 d.id menu,
                 d.name menu_name,
                 c.time,
                 f.id customer,
                 g.id customer_category,
                 f.name customer_name,
                 c.request,
                 a.status,
                 e.name status_name,
                 c.price,
                 f.address,
                 f.floor,
                 c.memo,
                 b.location
              FROM
                  (SELECT
                      order_code,
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
                AND g.id = f.category
              ) t
      WHERE (t.customer_name LIKE ?
         OR t.menu_name LIKE ?
         OR t.request LIKE ?
         OR t.status_name LIKE ?
         OR t.price LIKE ?)
         AND (t.status >= ? AND t.status <= ?)
      ORDER BY t.time DESC
      LIMIT ?, 20`;

  static getOrderStatusCount = `
      SELECT
          COUNT(*) count
      FROM
          (
              SELECT
                 a.order_code,
                 d.name menu_name,
                 f.name customer_name,
                 c.request,
                 e.status,
                 e.name status_name,
                 c.price
              FROM
                  (SELECT
                      order_code,
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
                AND f.id = c.customer
              ) t
      WHERE (t.customer_name LIKE ?
         OR t.menu_name LIKE ?
         OR t.request LIKE ?
         OR t.status_name LIKE ?
         OR t.price LIKE ?)
         AND (t.status >= ? AND t.status <= ?)`;

  static getRemainingPendingRequestCount = `
    SELECT
        t.status,
        COUNT(t.status) count
    FROM (
            SELECT MAX(status) status
              FROM order_status
             GROUP BY order_code
         ) t
    WHERE t.status = 1 OR t.status = 3 OR t.status = 5
    GROUP BY t.status;
  `;
}