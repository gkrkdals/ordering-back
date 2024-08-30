import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Like, Repository } from "typeorm";
import { GetCustomerResponseDto } from "@src/modules/main/manager/customer/dto/response/get-customer-response.dto";
import { countSkip, countToTotalPage } from "@src/utils/data";
import { CustomerCategory } from "@src/entities/customer-category.entity";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(CustomerCategory)
    private readonly customerCategoryRepository: Repository<CustomerCategory>,
  ) {}

  async getCustomer(page: number, query: string): Promise<Customer[] | GetCustomerResponseDto> {
    const like = Like(`%${query}%`)

    if (page) {
      const [data, count] = await this.customerRepository.findAndCount({
        take: 20,
        skip: countSkip(page),
        where: [
          { name: like },
          { address: like },
          { memo: like },
        ],
        relations: { categoryJoin: true }
      })

      return {
        currentPage: page,
        totalPage: countToTotalPage(count),
        data,
      }
    } else {
      return this.customerRepository.find();
    }
  }

  async getAll() { return this.customerRepository.find(); }

  async getCategories() { return this.customerCategoryRepository.find(); }

  async createCustomer(customer: Customer) {
    const newCustomer = new Customer();
    newCustomer.name = customer.name;
    newCustomer.memo = customer.memo;
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
    await this.customerRepository.delete({ id });
  }

}