import { Injectable } from "@nestjs/common";
import { User } from "@src/entities/user.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";
import { CreateAccountDto } from "@src/modules/auth/dto/create-account.dto";

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getAccounts() {
    return this.userRepository.findBy({ withdrawn: Not(1) });
  }

  async createAccount(body: CreateAccountDto) {
    const { username, password, nickname, permission } = body;
    const newUser = new User();
    newUser.username = username;
    newUser.password = password;
    newUser.nickname = nickname;
    newUser.permission = permission;
    await this.userRepository.save(newUser);
  }

  async updateAccount(account: User) {
    const modifiedUser = await this.userRepository.findOneBy({ id: account.id });
    modifiedUser.permission = account.permission;
    modifiedUser.nickname = account.nickname;
    await this.userRepository.save(modifiedUser);
  }

  async deleteAccount(id: number) {
    const deletedAccount = await this.userRepository.findOneBy({ id });
    deletedAccount.withdrawn = 1;
    await this.userRepository.save(deletedAccount);
  }
}