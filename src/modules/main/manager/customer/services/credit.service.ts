import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CustomerCredit } from "@src/entities/customer/customer-credit.entity";
import { User } from "@src/entities/user.entity";

@Injectable()
export class CreditService {
  constructor(
    @InjectRepository(CustomerCredit)
    private readonly customerCreditRepository: Repository<CustomerCredit>,
  ) {}

  async addCredit(mode: number, customer: number, price: number, currentAccount: User, memo: string) {
    const newCredit = new CustomerCredit();
    newCredit.orderCode = 0;
    newCredit.customer = customer;
    newCredit.creditDiff = mode === 0 ? price : price * -1;
    newCredit.by = currentAccount.id;
    newCredit.memo = memo;

    await this.customerCreditRepository.save(newCredit);
  }
}