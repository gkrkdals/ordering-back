import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Repository } from "typeorm";

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async getAll(): Promise<Customer[]> {
    return this.customerRepository.find();
  }
}