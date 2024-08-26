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
                 f.name customer_name,
                 c.request,
                 a.status,
                 e.status_name,
                 c.price,
                 c.memo
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
      WHERE t.customer_name LIKE ?
         OR t.menu_name LIKE ?
         OR t.request LIKE ?
         OR t.status_name LIKE ?
         OR t.price LIKE ?
      ORDER BY t.time DESC`;

  static getOrderStatusCount = `
      SELECT
          COUNT(*) count
      FROM
          (
              SELECT
                 b.id,
                 a.order_code,
                 d.id menu,
                 d.name menu_name,
                 c.time,
                 f.name customer_name,
                 c.request,
                 a.status,
                 e.status_name,
                 c.price,
                 c.memo
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
      WHERE t.customer_name LIKE ?
         OR t.menu_name LIKE ?
         OR t.request LIKE ?
         OR t.status_name LIKE ?
         OR t.price LIKE ?`
}