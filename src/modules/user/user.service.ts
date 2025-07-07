import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer/customer.entity";
import { Not, Repository } from "typeorm";
import { User } from "@src/entities/user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async findCustomer(id: number): Promise<Customer> {
    return this.customerRepository.findOneBy({ id, withdrawn: Not(1) });
  }

  async findUser(username: string, password: string): Promise<User> {
    return this.userRepository.findOneBy({ username, password, withdrawn: Not(1) });
  }
}