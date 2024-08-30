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
                 IF(d.id = 0, CONCAT('추가메뉴(', c.memo, ')'), d.name) menu_name,
                 c.time,
                 f.id customer,
                 f.name customer_name,
                 c.request,
                 a.status,
                 e.status_name,
                 c.price,
                 f.floor,
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
                 e.status_name,
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
      WHERE t.customer_name LIKE ?
         OR t.menu_name LIKE ?
         OR t.request LIKE ?
         OR t.status_name LIKE ?
         OR t.price LIKE ?`
}