export class CustomerSql {
  static getCustomer = `
    SELECT
        a.*,
        IFNULL(a.discount_group_id, -1) discount_group_id,
        IFNULL(credit_sum, 0) credit,
        IFNULL(c.name, '') AS discount_name
    FROM customer a
    LEFT JOIN
        (SELECT SUM(credit_diff) credit_sum, customer FROM customer_credit GROUP BY customer) b
    ON b.customer = a.id
    LEFT JOIN discount_group c ON a.discount_group_id = c.id
    WHERE
        withdrawn != 1
    AND (a.name LIKE ? OR address LIKE ? OR memo LIKE ? OR tel LIKE ?)
    ^
  `

  static getCustomerCount = `
    SELECT
        COUNT(*) count
    FROM customer a
    LEFT JOIN
        (SELECT SUM(credit_diff) credit_sum, customer FROM customer_credit GROUP BY customer) b
    ON b.customer = a.id
    WHERE
        withdrawn != 1
    AND (name LIKE ? OR address LIKE ? OR memo LIKE ?);
  `;
}