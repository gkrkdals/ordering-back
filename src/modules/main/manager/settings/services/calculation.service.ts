import { Injectable } from "@nestjs/common";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import { dateToString, isSameDay } from "@src/utils/date";
import { ExcelData } from "@src/types/models/ExcelData";
import { SettingsSql } from "@src/modules/main/manager/settings/sql/settings.sql";
import { InjectRepository } from "@nestjs/typeorm";
import { Order } from "@src/entities/order.entity";
import {  Repository } from "typeorm";
import { Response } from "express";
import * as XLSX from "xlsx-js-style";
import { eachCustomerHeader, eachCustomerHeaderWidth, header, mainHeader, mainHeaderWidth } from "@src/config/xlsx";
import * as fs from "node:fs";
import { MainCalculation } from "@src/modules/main/manager/settings/interfaces/MainCalculation";
import { Customer } from "@src/entities/customer.entity";
import { CustomerOrder } from "@src/modules/main/manager/settings/interfaces/CustomerOrder";

const empty: ExcelData = {
  customer_name: '',
  menu: '',
  menu_name: '',
  path: null,
  price: null,
  order_time: null,
  delivered_time: null,
  credit_by: '',
  credit_time: null,
  credit_in: null,
  memo: ''
}

@Injectable()
export class CalculationService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  async getCalculation(params: GetCalculationDto, res: Response) {
    const { menu, type, start, end } = params;
    const startDate = new Date(start);
    const endDate = new Date(end);

    startDate.setHours(9, 0, 0, 0);
    if (isSameDay(startDate, endDate)) {
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(8, 59, 59, 999);
    }

    const startString = dateToString(startDate);
    const endString = dateToString(endDate);

    const b = parseInt(type);

    let menuParam = null;
    const customerParam = null;

    if (b === 2) {
      menuParam = menu;
    }

    const wb = XLSX.utils.book_new();

    await this.getSummarySheet(startString, endString, menuParam, customerParam, wb);
    await this.getAllCustomerSheet(startString, endString, menuParam, wb);
    await this.getEachCustomersSheet(startString, endString, menuParam, wb);

    const filename = 'calculation.xlsx';
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });

    const stream = fs.createReadStream(filename);
    stream.pipe(res);
  }

  async getSummarySheet(start: string, end: string, menu: string | null, customer: string | null, wb: XLSX.WorkBook) {
    const ordinaryData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getOrdinaryData,
      [start, end, customer, customer, menu, menu]
    );

    const dishData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getDishData,
      [start, end, customer, customer,]
    );

    const extraData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getExtraData,
      [start, end, customer, customer,]
    );

    const excelData: ExcelData[] = ordinaryData.concat([empty]).concat(dishData).concat([empty]).concat(extraData);
    let numbering = 0;

    const data: any[][] = excelData.map((row) => {
      const p = this.getTheme(row.memo === '취소됨');
      const t = this.getTheme(row.memo === '취소됨', row.menu === 0);
      const q = this.getTheme(row.memo === '취소됨', row.menu === 0, true);
      const isRowEmpty = row.customer_name.length < 1

      if (!isRowEmpty) {
        numbering++;
      }
      if (row.memo === '취소됨') {
        row.price = null;
      }

      return [
        { v: isRowEmpty ? '' : numbering, t: "n", s: p },
        { v: row.customer_name, t: "s", s: p },
        { v: row.menu_name, t: "s", s: t },
        { v: row.price === null ? '' : parseInt(row.price), t: "n", s: q },
        { v: row.order_time === null ? '' : dateToString(new Date(row.order_time)), t: "s", s: p },
        { v: row.path ?? '', t: "s", s: p },
        { v: row.delivered_time === null ? '' : dateToString(new Date(row.delivered_time)), t: "s", s: p },
        { v: row.credit_by ?? '', t: "s", s: p },
        { v: row.credit_in === null ? '' : parseInt(row.credit_in), t: "n", s: q },
        { v: row.memo, t: "s", s: p }
      ];
    });

    const s = {
      font: {
        sz: '22'
      },
      border: {
        top: { style: 'thick' },
        bottom: { style: 'thick' },
        left: { style: 'thick' },
        right: { style: 'thick' },
      }
    }

    const summary = [
      { v: '매출', t: "s", s },
      { f: 'SUM(D3:D3000)', t: "n", s },
      { v: '입금', t: "s", s },
      { f: 'SUM(I3:I3000)', t: "n", s },
      { v: '차액', t: "s", s },
      { f: 'B1-D1', t: "n", s },
    ]

    const newWorksheet = XLSX.utils.aoa_to_sheet([summary, [], header, ...data]);
    newWorksheet['!cols'] = this.fitToColumn([summary, [], header, ...data]);

    XLSX.utils.book_append_sheet(wb, newWorksheet, '기간정산');
  }

  async getAllCustomerSheet(start: string, end: string, menu: string | null, wb: XLSX.WorkBook, ) {
    const mainSheetData: MainCalculation[] = await this.orderRepository.query(
      SettingsSql.getMainData,
      [start, end, menu, menu, start, end, menu, menu]
    );

    const data = mainSheetData.map((row, i) => {
      const ret: { v: any, t: any, s?: any }[] = [
        { v: row.name, t: 's' },
        { v: row.tel, t: 's' },
        { v: row.cnt, t: 'n' },
        { v: row.price, t: 'n' },
        { v: row.misu, t: 'n' },
        { v: row.sum, t: 'n' },
        { v: row.deposit_date, t: 's' },
        { v: row.deposit_nm, t: 's' },
        { v: row.deposit_amt, t: 's' },
        { v: '', t: 's' },
        { v: row.bigo, t: 's' },
      ];

      ret.forEach((row) => row.s = this.getColoredTheme(i));

      return ret;
    });

    const s = { font: { bold: true } }

    const topRow = [
      { v: '', t: 's' },
      { v: '', t: 's'  },
      { f: 'SUM(C3:C3000)', t: 'n', s },
      { f: 'SUM(D3:D3000)', t: 'n', s },
      { f: 'SUM(E3:E3000)', t: 'n', s },
      { f: 'SUM(F3:F3000)', t: 'n', s },
      { v: '', t: 's' },
      { v: '', t: 's' },
      { f: 'SUM(I3:I3000)', t: 'n', s },
      { v: '', t: 's' },
      { v: '', t: 's' },
    ]

    const workSheet = XLSX.utils.aoa_to_sheet([topRow, mainHeader, ...data]);
    workSheet['!cols'] = mainHeaderWidth;
    XLSX.utils.book_append_sheet(wb, workSheet, '전체정보');
  }

  async getEachCustomersSheet(start: string, end: string, menu: number | null, wb: XLSX.WorkBook) {
    const customers = await this.customerRepository.find({
      order: {
        name: 'ASC'
      }
    });

    const merge = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }
    ]

    for (const customer of customers) {
      const orders: CustomerOrder[] = await this.orderRepository.query(
        SettingsSql.getEachCustomerOrderData,
        [start, end, menu, menu, customer.id]
      )

      const data = orders.map((row) => [
        { v: row.customer_nm, t: 's', },
        { v: row.menu_nm, t: 's', },
        { v: row.price, t: 'n', },
        { v: dateToString(new Date(row.time)), t: 's', },
        { v: row.path, t: 's', },
      ]);

      const title = [
        { v: customer.name, t: 's', s: { alignment: { horizontal: 'center' } } }
      ];

      const escapedName = customer.name.replaceAll(/[\\/\[\]*?]/g, "");

      const workSheet = XLSX.utils.aoa_to_sheet([title, eachCustomerHeader, ...data]);
      workSheet['!merges'] = merge;
      workSheet['!cols'] = eachCustomerHeaderWidth;
      XLSX.utils.book_append_sheet(wb, workSheet, escapedName);
    }
  }

  private getTheme(isCancelled: boolean, isMenuZero?: boolean, alignRight?: boolean) {
    const theme: any = { font: {}, alignment: {} }

    if (isCancelled) {
      theme.font.color = { rgb: "FFAA0000" }
    }

    if(isMenuZero) {
      theme.font.bold = true;
    }

    if(alignRight) {
      theme.alignment.horizontal = "right";
    }

    return theme;
  }

  private fitToColumn(arrayOfArray: any[][]) {
    // get maximum character of each column
    return arrayOfArray[2].map((_, i) => ({ wch: Math.max(...arrayOfArray.map(a2 => a2[i] ? a2[i].toString().length : 0)) * 1.2 }));
  }

  private getColoredTheme(index: number) {
    return {
      fill: {
        fgColor: {
          rgb: index % 2 === 0 ? 'FFB7DEE8' : 'FFDAEEF3'
        }
      },
      border: {
        top: { color: { rgb: 'FFFFFFFF' } },
        bottom: { color: { rgb: 'FFFFFFFF' } },
        left: { color: { rgb: 'FFFFFFFF' } },
        right: { color: { rgb: 'FFFFFFFF' } },
      }
    }
  }
}