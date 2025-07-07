export class DisposalSql {
  static getDisposals = `
    SELECT
        b.order_code,
        b.status,
        c.id menu,
        IF(c.id = 0, a.request, c.name) menu_name,
        b.location
    FROM
        \`order\` a
    LEFT JOIN (
        SELECT
            a.*,
            b.location
        FROM (
            SELECT
                order_code, MAX(status) status
            FROM order_status
            GROUP BY order_code) a
        LEFT JOIN order_status b ON b.order_code = a.order_code AND b.status = a.status
    ) b ON b.order_code = a.id
    LEFT JOIN menu c ON a.menu = c.id
    WHERE (b.status = ? OR b.status = ?)
      AND a.customer = ?
    ORDER BY a.time DESC
  `;
}