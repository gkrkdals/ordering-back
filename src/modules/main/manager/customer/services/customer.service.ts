import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Not, Repository } from "typeorm";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { CustomerCategory } from "@src/entities/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { UpdateCustomerPriceDto } from "@src/modules/main/manager/customer/dto/update-customer-price.dto";
import { MenuCategory } from "@src/entities/menu-category.entity";
import { CustomerSql } from "@src/modules/main/manager/customer/sql/CustomerSql";
import { CustomerRaw } from "@src/types/models/CustomerRaw";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerCategory)
    private readonly customerCategoryRepository: Repository<CustomerCategory>,
    @InjectRepository(CustomerPrice)
    private readonly customerPriceRepository: Repository<CustomerPrice>,
    @InjectRepository(MenuCategory)
    private readonly menuCategoryRepository: Repository<MenuCategory>,
  ) {}

  async getCustomer(
    column: keyof Customer,
    order: '' | 'asc' | 'desc',
    page: number,
    query: string
  ): Promise<GetCustomerResponseDto> {
    const like = `%${query}%`

    let orderBy = ``;
    if (order !== '') {
      orderBy = `ORDER BY ${column} ${order}`;
    }

    const { count } = (await this.customerRepository.query(
      CustomerSql.getCustomerCount,
      new Array(3).fill(like)
    ))[0];

    const customers: CustomerRaw[] = await this.customerRepository.query(
      CustomerSql.getCustomer.replace('^', orderBy),
      [like, like, like, countSkip(page)]
    );

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      count,
      data: customers,
    }
  }

  async getAll() { return this.customerRepository.findBy({ withdrawn: Not(1) }); }

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

  async updateCustomer(customer: Customer) {
    const updatedCustomer = await this.customerRepository.findOneBy({ id: customer.id });

    if (updatedCustomer) {
      updatedCustomer.name = customer.name;
      updatedCustomer.address = customer.address;
      updatedCustomer.memo = customer.memo;
      updatedCustomer.category = customer.category;
      updatedCustomer.floor = customer.floor;
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
    const menuCategories = await this.menuCategoryRepository.findBy({ name: Not('커스텀') });

    for (const category of menuCategories) {
      const i = menuCategories.indexOf(category);
      const currentPrice = customerPrices.find((price) => price.category === category.id);
      const price = parseInt(body[i] as string);

      if(!isNaN(price)) {
        if (currentPrice) {
          currentPrice.price = price * 1000;
          await this.customerPriceRepository.save(currentPrice);
        } else {
          const newCustomerPrice = new CustomerPrice();
          newCustomerPrice.customer = body.customer;
          newCustomerPrice.category = category.id;
          newCustomerPrice.price = price * 1000;

          await this.customerPriceRepository.save(newCustomerPrice);
        }
      } else {
        await this.customerPriceRepository.delete({
          customer: body.customer,
          category: category.id,
        });
      }
    }
  }
}