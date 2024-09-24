export class CustomerSql {
  static getCustomerCredit =
    `
    SELECT IFNULL(t.credit, 0) AS credit
    FROM (SELECT 1) AS dummy
    LEFT JOIN (SELECT SUM(credit_diff) credit, customer FROM customer_credit GROUP BY customer) t
    ON t.customer = ?
    `;
}