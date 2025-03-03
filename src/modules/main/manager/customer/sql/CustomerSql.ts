export class CustomerSql {
  static getCustomer = `
    SELECT
        a.*,
        IFNULL(credit_sum, 0) credit
    FROM customer a
    LEFT JOIN
        (SELECT SUM(credit_diff) credit_sum, customer FROM customer_credit GROUP BY customer) b
    ON b.customer = a.id
    WHERE
        withdrawn != 1
    AND (name LIKE ? OR address LIKE ? OR memo LIKE ? OR tel LIKE ?)
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