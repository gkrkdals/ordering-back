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
    await this.getEachCustomersSheet(wb, excelData, allData, startString, endString);

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
        start, end, customer, customer,
      ]
    );

    let numbering = 0;

    const length = excelData.length;
    
    const usedPointTotal = excelData
      .filter(row => row.memo === '저억리입그음')
      .reduce((sum, row) => sum + (Number(row.point_amt) || 0), 0) * -1;

    const totalPoint = (await this.orderRepository.query(
      SettingsSql.getTotalPoint,
    ))[0]?.total_point || 0;

    const misu = (await this.orderRepository.query(
      SettingsSql.getMisu,
      [start, menu, menu]
    ))[0]?.misu || 0;

    const totalCredit = (await this.orderRepository.query(
      SettingsSql.getTotalCredit
    ))[0]?.total_credit || 0;

       // 🌟 2. 엑셀 하단 표에 실제로 나열할 데이터만 필터링 ('저억리입그음' 행 제외)
    const displayData = excelData.filter(row => row.memo !== '저억리입그음');

    const data: any[][] = displayData.map((row) => {
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
        // { v: row.credit_in === null ? '' : parseInt(row.credit_in), t: "n", s: q },
        { v: row.disposal_time === null ? '' : dateToString(new Date(row.disposal_time)), t: "s", s: p },
        { v: row.disposal_manager ?? '', t: "s", s: p },
        // { v: row.disposal_in === null ? '' : parseInt(row.disposal_in), t: "n", s: q },
        { v: row.master_time === null ? '' : dateToString(new Date(row.master_time)), t: "s", s: p },
        { v: row.master_manager ?? '', t: "s", s: p },
        { v: row.point_amt !== null && !isNaN(parseInt(row.point_amt)) ? parseInt(row.point_amt) * 100 : '', t: "n", s: q },
        { v: this.getIn(row), t: "n", s: q },
        { v: this.getMethod(row), t: "s", s: p },
        { v: row.memo, t: "s", s: p },
        { v: row.bigo ?? '', t: "s", s: p }
      ];
    });

    

    const s = {
      font: {
        sz: '14' // 보통 굵기 (bold 속성 없음)
      },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    };

    // 정산 기간 전용 스타일 (폰트 사이즈 더 작게)
    const sTime = {
      ...s,
      font: { sz: '11' } // 원하는 크기로 조절 (예: 10, 11, 12)
    };

    // 'yyyy-mm-dd hh:mm:ss' 형태에서 앞의 10자리('yyyy-mm-dd')만 잘라내기
    const formattedStart = start.substring(0, 10);
    const formattedEnd = end.substring(0, 10);

    // 1. 새로운 헤더 (첫 번째 줄)
    const summaryHeader = [
      { v: `${formattedStart} ~ ${formattedEnd}`, t: "s", s: sTime }, // A~C (정산 기간)
      {}, // B (병합용)
      {}, // C (병합용)
      { v: '수량', t: "s", s },
      { v: '금액', t: "s", s },
      { v: '미수', t: "s", s },
      { v: '입금액', t: "s", s },
      { v: '합계', t: "s", s }, // 사진 2의 '잔액', 사진 3의 '합계' 반영
      { v: '총잔액', t: "s", s },
      { v: '적립금', t: "s", s },
      { v: '적립금 사용', t: "s", s },
      { v: '적립금잔액', t: "s", s },
    ];

    const sNum = {
      ...s,
      numFmt: '#,##0.0'
    };

    // 2. 값을 넣을 빈칸 (두 번째 줄 - 나중에 채울 공간)
    const summaryValue = [
      {}, {}, {}, // A~C 정산 기간 아래 빈칸 (위와 병합됨)
      { f: `SUBTOTAL(104, A5:A${length + 4})`, t: "n", s }, // 수량 값
      // E열 (금액): D열(가격)의 합계
      { f: `(SUBTOTAL(109, D5:D${length + 4}))/1000`, t: "n", s: sNum }, 
      
      // F열 (미수): 정산 시작일 이전의 미수금 (★일단 빈칸)
      { v: misu / 1000, t: "n", s: sNum }, 
      
      // G열 (입금액): N열(입금액)의 합계 (사진 요청사항 반영)
      { f: `(SUBTOTAL(109, N5:N${length + 4}))/1000`, t: "n", s: sNum }, 
      
      // H열 (합계): 금액(E2) + 미수(F2) - 입금액(G2)
      { f: 'E2+F2-G2', t: "n", s: sNum }, 
      
      // I열 (총잔액): 전체 누적 잔액 (★일단 빈칸)
      { v: totalCredit / 1000, t: "n", s: sNum }, 
      
      // J열 (적립금): M열(적립금)의 합계 (사진 요청사항 반영)
      { f: `(SUBTOTAL(109, M5:M${length + 4}))/1000`, t: "n", s: sNum }, 
      
      // K열 (적립금 사용): 해당 기간 내 사용액 (★일단 빈칸)
      { v: usedPointTotal / 1000, t: "n", s: sNum }, 
      
      // L열 (적립금잔액): 현재 남아있는 총 적립금 (★일단 빈칸)
      { v: totalPoint / 100, t: "n", s: sNum },
    ];

    // 3. A1 부터 C2 까지(정산 기간 부분)를 하나의 큰 칸으로 병합
    const merge = [
      { s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }, 
    ];

    // 4. 시트 생성 및 적용 (기존 1줄에서 2줄 구조로 변경)
    const ws = XLSX.utils.aoa_to_sheet([summaryHeader, summaryValue, [], header, ...data]);
    ws['!merges'] = merge;
    const colsWidth = this.fitToColumn([summaryHeader, summaryValue, [], header, ...data]);
    colsWidth[0] = { wch: 5 };
    ws['!cols'] = colsWidth;
    ws['!autofilter'] = { ref: 'A4:R4' }; // 헤더가 2줄이 되었으므로 필터 기준줄을 3에서 4로 내림
    ws['!freeze'] = { ySplit: 2 }; // 상단 2줄 고정

    XLSX.utils.book_append_sheet(wb, ws, '기간정산');

    return displayData;
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
        start, end
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
      { f: `SUBTOTAL(109, C3:C${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, D3:D${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, E3:E${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, F3:F${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, G3:G${length + 5})`, t: 'n', s: { ...s, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, H3:H${length + 5})`, t: 'n', s, },
      { v: '', t: 's' },
    ]

    const workSheet = XLSX.utils.aoa_to_sheet([topRow, mainHeader, ...data]);
    workSheet['!cols'] = mainHeaderWidth;
    workSheet['!autofilter'] = { ref: 'A2:I2' };
    XLSX.utils.book_append_sheet(wb, workSheet, '전체정보');

    return mainSheetData;
  }

  async getEachCustomersSheet(
    wb: XLSX.WorkBook, excelData: ExcelData[], allData: MainCalculation[], startDate: string, endDate: string
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
          { v: row.path ?? '', t: "s", s: p },
          { v: row.point_amt !== null && !isNaN(parseInt(row.point_amt)) ? parseInt(row.point_amt) * 100 : '', t: "n", s: q },
          { v: row.memo, t: "s", s: p },
          { v: row.bigo ?? '', t: "s", s: p }
        ]
      });

      const p = { alignment: { horizontal: 'center' } };
      const q = {
        ...p,
        numFmt: '₩#,##0.0'
      }

      // 정산 기간 전용 스타일 (폰트 사이즈 더 작게)
      const sTime = {
        ...p,
        font: { sz: '11' } // 원하는 크기로 조절 (예: 10, 11, 12)
      };

      const formattedStart = startDate.substring(0, 10);
      const formattedEnd = endDate.substring(0, 10);

        // 1. 기간정산 탭과 동일한 12개 컬럼 헤더
      const title1 = [
        { v: `${formattedStart} ~ ${formattedEnd}`, t: 's', s: sTime },
        {}, {}, // A~C 병합용
        { v: '수량', s: p },
        { v: '금액', s: p },
        { v: '미수', s: p },
        { v: '입금액', s: p },
        { v: '합계', s: p },
        { v: '총잔액', s: p },
        { v: '적립금', s: p },
        { v: '적립금사용액', s: p },
        { v: '적립금잔액', s: p },
      ];

      // 2. 쿼리에서 가져온 요약 값 매핑
      const title2 = [
        {}, {}, {},
        { v: summary.cnt, t: 'n', s: p },
        { v: summary.price / 1000, t: 'n', s: q },
        { v: summary.misu / 1000, t: 'n', s: q },
        { v: (Number(summary.deposit_amt)) / 1000, t: 'n', s: q },
        { v: summary.sum / 1000, t: 'n', s: q },
        { v: summary.total_credit / 1000, t: 'n', s: q },
        { v: summary.earned_point / 1000, t: 'n', s: q },
        { v: summary.used_point / 1000, t: 'n', s: q },
        { v: summary.point_balance / 1000, t: 'n', s: q },
      ];

      const merge = [
        { s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }, // 고객명 (A~C)
      ];

      const escapedName = customer.name.replaceAll(/[\\/\[\]*?]/g, "");

      try {
        const workSheet = XLSX.utils.aoa_to_sheet([title1, title2, eachCustomerHeader, ...data]);
        workSheet['!merges'] = merge;
        workSheet['!cols'] = eachCustomerHeaderWidth;
        workSheet['!autofilter'] = { ref: 'A3:Q3' };
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
    // 1. 전체 배열 중 가장 열이 많은 행(보통 헤더 행)을 찾아서 총 열 개수를 구합니다.
    const maxCols = Math.max(...arrayOfArray.map(row => row.length));

    const widths = [];
    
    // 2. 각 열(Column)마다 돌면서 가장 긴 글자 수를 찾습니다.
    for (let i = 0; i < maxCols; i++) {
      const maxWidth = Math.max(...arrayOfArray.map(row => {
        const cell = row[i];
        if (!cell) return 0;

        // 셀이 { v: '데이터' } 객체 형태면 v를 빼오고, 아니면 그대로 씁니다.
        const cellValue = cell.v !== undefined ? cell.v : cell;
        if (cellValue === null || cellValue === undefined) return 0;

        const text = cellValue.toString();
        
        // 한글은 영어/숫자보다 엑셀에서 자리를 더 많이 차지하므로 가중치를 줍니다.
        const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
        return text.length * (isKorean ? 2.0 : 1.2); 
      }));

      // 3. 텍스트가 너무 짧을 때를 대비해 기본 최소 너비(10)를 주고, 여백(+2)을 추가합니다.
      widths.push({ wch: Math.max(10, maxWidth + 2) });
    }

    return widths;
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

  getTime(time: string) {
    return time === null ? '' : dateToString(new Date(time));
  }

  getMethod(row: ExcelData) {
    if (parseInt(row.credit_in) !== 0 && !isNaN(parseInt(row.credit_in))) {
      return '배달완료';
    } else if (parseInt(row.disposal_in) !== 0 && !isNaN(parseInt(row.disposal_in))) {
      return '그릇수거';
    } else if (parseInt(row.master_in) !== 0 && !isNaN(parseInt(row.master_in))) {
      return '마스터'
    }
    return '';
  }

  getIn(row: ExcelData) {
    if (row.credit_in && !isNaN(parseInt(row.credit_in))) {
      return parseInt(row.credit_in);
    } else if (row.disposal_in && !isNaN(parseInt(row.disposal_in))) {
      return parseInt(row.disposal_in);
    } else if (row.master_in && !isNaN(parseInt(row.master_in))) {
      return parseInt(row.master_in);
    }

    return '';
  }
}