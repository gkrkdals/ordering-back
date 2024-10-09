import { Injectable, StreamableFile } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Customer } from "@src/entities/customer.entity";
import { Not, Repository } from "typeorm";
import { Settings } from "@src/entities/settings.entity";
import { createReadStream } from 'fs';
import * as Path from 'path';
import { Response } from "express";

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Settings)
    private readonly settingsRepository: Repository<Settings>,
  ) {}

  async updateShowPrice(customerId: number, value: 0 | 1) {
    const customer = await this.customerRepository.findOneBy({ id: customerId });
    customer.showPrice = value;
    await this.customerRepository.save(customer);
  }

  async updateHideOrderStatus(customerId: number, value: 0 | 1) {
    const customer = await this.customerRepository.findOneBy({ id: customerId });
    customer.hideOrderStatus = value;
    await this.customerRepository.save(customer);
  }

  async getStandardSettings() {
    return this.settingsRepository.findBy({ big: 2, sml: Not(1) });
  }

  async getLogo(res: Response) {
    const filename = (await this.settingsRepository.findOneBy({ big: 2, sml: 1 })).stringValue;
    const ext = filename.split('.').at(1);
    const file = createReadStream(Path.join(process.cwd(), 'logo', filename));
    res.set({
      'Content-Type': `image/${ext}`
    })
    return new StreamableFile(file);
  }
}