export class OrderSql {
  static getOrderStatus = `
    SELECT
        b.id,
        a.status,
        d.name status_name,
        b.menu,
        c.name menu_name
    FROM
        (SELECT
             order_code,
             MAX(status) status
         FROM order_status
         GROUP BY order_code) a,
        \`order\` b,
        \`menu\` c,
        \`order_category\` d
    WHERE b.id = a.order_code
      AND b.customer = ?
      AND c.id = b.menu
      AND d.id = a.status
      AND a.status < 5
    ORDER BY status DESC`;
}