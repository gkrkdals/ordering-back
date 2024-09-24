import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Like, Not, Repository } from "typeorm";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { CustomerCategory } from "@src/entities/customer-category.entity";
import { CustomerPrice } from "@src/entities/customer-price";
import { UpdateCustomerPriceDto } from "@src/modules/main/manager/customer/dto/update-customer-price.dto";
import { MenuCategory } from "@src/entities/menu-category.entity";
import { CustomerWithCredit } from "@src/types/models/CustomerWithCredit";
import { CustomerSql } from "@src/modules/main/manager/customer/sql/CustomerSql";

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

  async getCustomer(page: number, query: string): Promise<GetCustomerResponseDto> {
    const like = Like(`%${query}%`)

    const [data, count] = await this.customerRepository.findAndCount({
      take: 20,
      skip: countSkip(page),
      where: [
        { name: like, withdrawn: Not(1) },
        { address: like, withdrawn: Not(1) },
        { memo: like, withdrawn: Not(1) },
      ],
      relations: {
        categoryJoin: true,
        customerPriceJoin: true,
      }
    });

    const dataWithCredit: CustomerWithCredit[] = [];

    for (const customer of data) {
      const credit: number = parseInt((await this.customerRepository.query(CustomerSql.getCustomerCredit, [customer.id])).at(0).credit);

      dataWithCredit.push({
        ...customer,
        credit
      });
    }

    return {
      currentPage: page,
      totalPage: countToTotalPage(count),
      count,
      data: dataWithCredit,
    }
  }

  async getAll() { return this.customerRepository.findBy({ withdrawn: Not(1) }); }

  async getCategories() { return this.customerCategoryRepository.find(); }

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
      await this.customerRepository.save(updatedCustomer);
    }
  }

  async deleteCustomer(id: number) {
    const foundCustomer = await this.customerRepository.findOneBy({ id });
    foundCustomer.withdrawn = 1;
    await this.customerRepository.save(foundCustomer);
  }

  async getCustomerPrice(id: number) {
    return this.customerPriceRepository.find({
      where: { customer: id },
      order: { category: 'ASC' }
    });
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
          currentPrice.price = price;
          await this.customerPriceRepository.save(currentPrice);
        } else {
          const newCustomerPrice = new CustomerPrice();
          newCustomerPrice.customer = body.customer;
          newCustomerPrice.category = category.id;
          newCustomerPrice.price = price;

          await this.customerPriceRepository.save(newCustomerPrice);
        }
      }
    }
  }

}