export class SettingsSql {
  static getExcelData = `
    SELECT
        t.customer_name,
        t.menu_name,
        t.price,
        SUBSTRING_INDEX(t.time, ' ', 1) time,
        user.nickname credit_by,
        p.credit_time,
        IFNULL(p.credit, 0) credit_in,
        sum_table.credit_sum credit_total
    FROM (
        SELECT
            a.id order_code,
            a.customer,
            b.name customer_name,
            a.menu,
            c.name menu_name,
            a.price,
            time
        FROM
            \`order\` a,
            customer b,
            menu c
        WHERE
            b.id = a.customer
        AND c.id = a.menu) t
    LEFT JOIN
        (SELECT
             SUM(credit_diff) credit,
             order_code,
             MAX(\`by\`) \`by\`,
             MAX(time) credit_time
         FROM customer_credit
         WHERE
             credit_diff > 0
         GROUP BY order_code, \`by\`) p
            ON p.order_code = t.order_code
    LEFT JOIN user on p.by = user.id
    LEFT JOIN (
        SELECT
            order_code,
            SUM(credit) over (partition by customer order by order_code) as credit_sum
        FROM (
            SELECT
                order_code,
                customer,
                SUM(credit_diff) credit
            FROM customer_credit
            GROUP BY order_code, customer) x) sum_table
    ON sum_table.order_code = t.order_code
    WHERE
        t.time >= ? AND t.time <= ?
    AND (t.customer = ? OR ISNULL(?))
    AND (t.menu = ? OR ISNULL(?))
  `
}