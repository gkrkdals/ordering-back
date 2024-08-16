export class OrderSql {
  static getOrderStatus =
    `SELECT
        b.id,
        max(a.status) AS status,
        d.status_name,
        menu,
        c.name menu_name
    FROM order_status a
        INNER JOIN \`order\` b on b.id = a.order_code
        INNER JOIN \`menu\` c on c.id = b.menu
        INNER JOIN \`order_category\` d on a.status = d.status
    WHERE customer = ?
      AND b.done < 1
    GROUP BY b.id, status_name`
}