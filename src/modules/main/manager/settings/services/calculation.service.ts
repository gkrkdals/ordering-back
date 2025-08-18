import { Injectable } from "@nestjs/common";
import { GetCalculationDto } from "@src/modules/main/manager/settings/dto/get-calculation.dto";
import { dateToString, isSameDay } from "@src/utils/date";
import { ExcelData } from "@src/types/models/ExcelData";
import { SettingsSql } from "@src/modules/main/manager/settings/sql/settings.sql";
import { InjectRepository } from "@nestjs/typeorm";
import { Order } from "@src/entities/order/order.entity";
import {  Repository } from "typeorm";
import { Response } from "express";
import * as XLSX from "xlsx-js-style";
import { eachCustomerHeader, eachCustomerHeaderWidth, header, mainHeader, mainHeaderWidth } from "@src/config/xlsx";
import * as fs from "node:fs";
import { MainCalculation } from "@src/modules/main/manager/settings/interfaces/MainCalculation";
import { Customer } from "@src/entities/customer/customer.entity";
// import { CustomerCalculation } from "@src/modules/main/manager/settings/interfaces/CustomerCalculation";

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
    const today = new Date();

    startDate.setHours(9, 0, 0, 0);
    if (isSameDay(startDate, endDate) && isSameDay(startDate, today)) {
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

    const excelData = await this.getSummarySheet(startString, endString, menuParam, customerParam, wb);
    const allData = await this.getAllCustomerSheet(startString, endString, menuParam, wb);
    await this.getEachCustomersSheet(wb, excelData, allData);

    const filename = 'calculation.xlsx';
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });

    const stream = fs.createReadStream(filename);
    stream.pipe(res);
  }

  async getSummarySheet(start: string, end: string, menu: string | null, customer: string | null, wb: XLSX.WorkBook) {
    const excelData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getOrdinaryData,
      [
        start, end, customer, customer, menu, menu,
        start, end, customer, customer,
        start, end, customer, customer,
        start, end, start, customer, customer,
      ]
    );

    let numbering = 0;

    const length = excelData.length;

    const data: any[][] = excelData.map((row) => {
      const cancelled = row.price === '취소됨';
      const p = this.getTheme(cancelled);
      const t = this.getTheme(cancelled, row.menu === 0);
      const q = this.getTheme(cancelled, row.menu === 0, true);
      q.numFmt = '#,###';
      numbering++;

      const priceValue = row.price === null ? '' : (cancelled ? '취소됨' : parseInt(row.price));

      return [
        { v: numbering, t: "n", s: p },
        { v: row.customer_name, t: "s", s: { ...p, fill: { fgColor: { rgb: `${row.hex === 'FFFFFF' ? '00' : 'FF'}${row.hex}` } } } },
        { v: row.menu_name, t: "s", s: t },
        { v: priceValue, t: cancelled ? "s" : "n", s: q },
        { v: row.order_time === null ? '' : dateToString(new Date(row.order_time)), t: "s", s: p },
        { v: row.path ?? '', t: "s", s: p },
        { v: row.delivered_time === null ? '' : dateToString(new Date(row.delivered_time)), t: "s", s: p },
        { v: row.credit_by ?? '', t: "s", s: p },
        { v: row.credit_in === null ? '' : parseInt(row.credit_in), t: "n", s: q },
        { v: row.disposal_time === null ? '' : dateToString(new Date(row.disposal_time)), t: "s", s: p },
        { v: row.disposal_manager ?? '', t: "s", s: p },
        { v: row.disposal_in === null ? '' : parseInt(row.disposal_in), t: "n", s: q },
        { v: row.master_time === null ? '' : dateToString(new Date(row.master_time)), t: "s", s: p },
        { v: row.master_manager ?? '', t: "s", s: p },
        { v: row.master_in === null ? '' : parseInt(row.master_in), t: "n", s: q },
        { v: row.memo, t: "s", s: p },
        { v: row.bigo ?? '', t: "s", s: p }
      ];
    });

    const s = {
      font: {
        sz: '18'
      },
      border: {
        top: { style: 'thick' },
        bottom: { style: 'thick' },
        left: { style: 'thick' },
        right: { style: 'thick' },
      }
    }

    const summary = [
      { v: '', t: "s" },
      { v: '매출', t: "s", s },
      { f: `SUM(D4:D${length + 5})`, t: "n", s: { ...s, numFmt: '₩#,###' } },
      { v: '입금', t: "s", s },
      { f: `SUM(I4:I${length + 5},L4:L${length + 5},O4:O${length + 5})`, t: "n", s: { ...s, numFmt: '₩#,###' } },
      { v: '차액', t: "s", s },
      { f: 'C1-E1', t: "n", s: { ...s, numFmt: '₩#,###' } },
    ]

    const ws = XLSX.utils.aoa_to_sheet([summary, [], header, ...data]);
    ws['!cols'] = this.fitToColumn([summary, [], header, ...data]);
    ws['!autofilter'] = { ref: 'A3:P3' };
    ws['!freeze'] = { ySplit: 1 }

    XLSX.utils.book_append_sheet(wb, ws, '기간정산');

    return excelData;
  }

  async getAllCustomerSheet(start: string, end: string, menu: string | null, wb: XLSX.WorkBook, ) {
    const mainSheetData: MainCalculation[] = await this.orderRepository.query(
      SettingsSql.getAllCustomerOrderData,
      [
        start, end, menu, menu,
        start, menu, menu,
        start, end, menu, menu,
        start, end, menu, menu,
        start, end, menu, menu,
      ]
    );

    const length = mainSheetData.length;

    const data = mainSheetData.map((row, i) => {
      const ret: { v: any, t: any, s?: any }[] = [
        { v: row.name, t: 's' },
        { v: row.tel, t: 's' },
        { v: row.price, t: 'n', s: { numFmt: '#,###' } },
        { v: row.misu, t: 'n', s: { numFmt: '#,###' } },
        { v: row.deposit_amt, t: 'n', s: { numFmt: '#,###' } },
        { v: row.sum, t: 'n', s: { numFmt: '#,###' } },
        { v: row.total_credit, t: 'n', s: { numFmt: '#,###' } },
        { v: row.cnt, t: 'n' },
        { v: row.bigo, t: 's' },
      ];

      ret.forEach((cell, index) => {
        cell.s = this.getColoredTheme(i);
        if (index >= 2 && index <= 6) {
          cell.s.numFmt = '#,###';
        }
      });

      if (row.hex !== 'FFFFFF') {
        ret[0].s.fill = { fgColor: { rgb: `FF${row.hex}` } }
      }

      return ret;
    });

    const s = { font: { bold: true } }

    const topRow = [
      { v: '', t: 's' },
      { v: '', t: 's'  },
      { f: `SUM(C3:C${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUM(D3:D${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUM(E3:E${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUM(F3:F${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUM(G3:G${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUM(H3:H${length + 5})`, t: 'n', s, },
      { v: '', t: 's' },
    ]

    const workSheet = XLSX.utils.aoa_to_sheet([topRow, mainHeader, ...data]);
    workSheet['!cols'] = mainHeaderWidth;
    workSheet['!autofilter'] = { ref: 'A2:I2' };
    XLSX.utils.book_append_sheet(wb, workSheet, '전체정보');

    return mainSheetData;
  }

  async getEachCustomersSheet(
    wb: XLSX.WorkBook, excelData: ExcelData[], allData: MainCalculation[]
  ) {
    const customers = await this.customerRepository.find({
      relations: {
        categoryJoin: true
      },
      order: {
        name: 'ASC'
      }
    });

    for (const customer of customers) {
      const orders = excelData.filter((data) => data.customer === customer.id);
      const hex = customer.categoryJoin.hex;

      const summary = allData.find((data) => data.id === customer.id);
      let numbering = 0;
      const data = orders.map((row) => {
        const cancelled = row.price === '취소됨';
        const p = this.getTheme(cancelled);
        const t = this.getTheme(cancelled, row.menu === 0);
        const q = this.getTheme(cancelled, row.menu === 0, true);
        q.numFmt = '#,###';

        // if (row.memo === '취소됨') {
        //   row.price = null;
        // }

        const priceValue = row.price === null ? '' : (cancelled ? '취소됨' : parseInt(row.price));

        numbering++;

        return [
          { v: numbering, t: "n", s: p },
          { v: row.customer_name, t: "s", s: p },
          { v: row.menu_name, t: "s", s: t },
          { v: priceValue, t: cancelled ? 's' : 'n', s: q },
          { v: row.order_time === null ? '' : dateToString(new Date(row.order_time)), t: "s", s: p },
          { v: row.path ?? '', t: "s", s: p },
          // 아래는 마스터입금도 고려
          { v: this.getTime(row), t: "s", s: p },
          { v: this.getBy(row), t: "s", s: p },
          { v: this.getIn(row), t: "n", s: q },
          { v: row.memo, t: "s", s: p },
          { v: row.bigo ?? '', t: "s", s: p },
        ]
      });

      const p = { alignment: { horizontal: 'center' } };
      const q = {
        ...p,
        numFmt: '₩#,###'
      }

      const title1 = [
        {
          v: customer.name,
          t: 's',
          s: {
            ...p,
            fill: { fgColor: { rgb: `${hex === 'FFFFFF' ? '00' : 'FF'}${hex}` } },
            font: { sz: '18' },
          }
        },
        {},
        {},
        { v: '수량', s: p },
        { v: '금액', s: p },
        { v: '미수', s: p },
        { v: '입금액', s: p },
        { v: '합계', s: p },
        {},
        { v: '총잔액', s: p },
      ];

      const title2 = [
        {}, {}, {},
        { v: summary.cnt, t: 'n', s: p },
        { v: summary.price, t: 'n', s: q },
        { v: summary.misu, t: 'n', s: q },
        { v: summary.deposit_amt, t: 'n', s: q },
        { v: summary.sum, t: 'n', s: q },
        {},
        { v: summary.total_credit, t: 'n', s: q },
        {}
      ]

      const merge = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } },
      ]

      const escapedName = customer.name.replaceAll(/[\\/\[\]*?]/g, "");

      try {
        const workSheet = XLSX.utils.aoa_to_sheet([title1, title2, eachCustomerHeader, ...data]);
        workSheet['!merges'] = merge;
        workSheet['!cols'] = eachCustomerHeaderWidth;
        workSheet['!autofilter'] = { ref: 'A3:J3' };
        XLSX.utils.book_append_sheet(wb, workSheet, escapedName);
      } catch (e) {
        console.error(e);
      }
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
    const style: any = {
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

    return style;
  }

  getTime(row: ExcelData) {
    if (row.delivered_time !== null) {
      return dateToString(new Date(row.delivered_time));
    } else if (row.disposal_time !== null) {
      return dateToString(new Date(row.disposal_time));
    } else if (row.master_time !== null) {
      return dateToString(new Date(row.master_time));
    }

    return '';
  }

  getBy(row: ExcelData) {
    if (row.credit_by !== null) {
      return row.credit_by;
    } else if (row.disposal_manager !== null) {
      return row.disposal_manager;
    } else if (row.master_manager !== null) {
      return row.master_manager;
    }

    return '';
  }

  getIn(row: ExcelData) {
    if (row.credit_in !== null) {
      return parseInt(row.credit_in);
    } else if (row.disposal_in !== null) {
      return parseInt(row.disposal_in);
    } else if (row.master_in !== null) {
      return parseInt(row.master_in);
    }
  }
}