export class DisposalSql {
  static getDisposals = `
    SELECT
        a.order_code,
        a.status,
        c.id menu,
        IF(c.id = 0, b.memo, c.name) menu_name,
        d.location
    FROM
        (SELECT order_code, MAX(status) status FROM order_status GROUP BY order_code) a,
        \`order\` b,
        menu c,
        order_status d
    WHERE (a.status = (SELECT status FROM order_category WHERE name = '수거대기') OR a.status = (SELECT status FROM order_category WHERE name = '수거중'))
      AND b.id = a.order_code
      AND b.customer = ?
      AND c.id = b.menu
      AND d.order_code = a.order_code
      AND d.status = a.status  
  `;
}