import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Repository } from "typeorm";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>
  ) {}

  async findCustomer(id: number): Promise<Customer> {
    return this.customerRepository.findOneBy({ id });
  }
}