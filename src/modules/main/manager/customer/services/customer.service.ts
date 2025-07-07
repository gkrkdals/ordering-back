import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Not, Repository } from "typeorm";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";
import { countToTotalPage } from "@src/utils/data";
import { CustomerCategory } from "@src/entities/customer/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { UpdateCustomerPriceDto } from "@src/modules/main/manager/customer/dto/update-customer-price.dto";
import { CustomerSql } from "@src/modules/main/manager/customer/sql/CustomerSql";
import { CustomerRaw } from "@src/types/models/CustomerRaw";
import * as XLSX from "xlsx-js-style";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerCategory)
    private readonly customerCategoryRepository: Repository<CustomerCategory>,
    @InjectRepository(CustomerPrice)
    private readonly customerPriceRepository: Repository<CustomerPrice>,
  ) {}

  async getCustomer(
    column: keyof Customer,
    order: '' | 'asc' | 'desc',
    page: number,
    query: string
  ): Promise<GetCustomerResponseDto> {
    const like = `%${query}%`

    let orderBy: string;
    if (order !== '') {
      orderBy = `ORDER BY ${column} ${order}, id ${order}`;
    } else {
      orderBy = `ORDER BY recent_order DESC, id`;
    }

    const { count } = (await this.customerRepository.query(
      CustomerSql.getCustomerCount,
      new Array(3).fill(like)
    ))[0];

    const customers: CustomerRaw[] = await this.customerRepository.query(
      CustomerSql.getCustomer.replace('^', orderBy),
      [like, like, like, like]
    );

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      count,
      data: customers,
    }
  }

  async getAll() {
    return this.customerRepository.find({
      where: {
        withdrawn: Not(1),
      },
      order: {
        recentOrder: 'desc'
      }
    });
  }

  async getCategories() { return this.customerCategoryRepository.find(); }

  async getCustomerPrice(id: number) {
    return (await this.customerPriceRepository.find({
      where: { customer: id },
      order: { category: 'ASC' }
    })).map(customerPrice => ({
      ...customerPrice,
      price: customerPrice.price / 1000,
    }));
  }

  async createCustomer(customer: Customer) {
    const newCustomer = new Customer();
    newCustomer.name = customer.name;
    newCustomer.memo = customer.memo;
    newCustomer.floor = customer.floor
    newCustomer.address = customer.address;

    await this.customerRepository.save(newCustomer);
  }

  async createCustomerFromExcel(excel: Express.Multer.File) {
    const workbook = XLSX.read(excel.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    for (const row of data) {
      const customerName = row['고객명'];
      const address = row['주소'];
      const floor = row['층수'];
      const memo = row['그릇 찾는곳/주의사항'];
      const category = ((typeof row['카테고리'] === 'string') ? parseInt(row['카테고리']) : row['카테고리']) + 2;

      if (customerName === undefined || customerName === null) {
        continue;
      }

      if (!isNaN(category)) {
        const newCustomer = new Customer();
        newCustomer.name = customerName;
        newCustomer.address = address;
        newCustomer.floor = floor;
        newCustomer.memo = memo;
        newCustomer.category = category;

        await this.customerRepository.save(newCustomer);
      }
    }
  }

  async updateCustomer(customer: Customer) {
    const updatedCustomer = await this.customerRepository.findOneBy({ id: customer.id });

    if (updatedCustomer) {
      updatedCustomer.name = customer.name;
      updatedCustomer.address = customer.address;
      updatedCustomer.memo = customer.memo;
      updatedCustomer.category = customer.category;
      updatedCustomer.floor = customer.floor;
      updatedCustomer.tel = customer.tel;
      await this.customerRepository.save(updatedCustomer);
    }
  }

  async deleteCustomer(id: number) {
    const foundCustomer = await this.customerRepository.findOneBy({ id });
    foundCustomer.withdrawn = 1;
    await this.customerRepository.save(foundCustomer);
  }

  async updateCustomerPrice(body: UpdateCustomerPriceDto) {
    const customerPrices = await this.customerPriceRepository.findBy({ customer: body.customer });

    const { data, customer } = body;
    for (const priceData of data) {
      const category = priceData.id, price = parseInt(priceData.price) * 1000;
      const currentPrice = customerPrices.find(price => price.category === priceData.id);

      if (!isNaN(price)) {
        if (currentPrice) {
          currentPrice.price = price;
          await this.customerPriceRepository.save(currentPrice);
        } else {
          const newCustomerPrice = new CustomerPrice();
          newCustomerPrice.customer = customer;
          newCustomerPrice.category = category;
          newCustomerPrice.price = price;
          await this.customerPriceRepository.save(newCustomerPrice)
        }
      } else {
        await this.customerPriceRepository.delete({ customer, category })
      }
    }
  }
}
