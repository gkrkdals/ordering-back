import { Injectable } from "@nestjs/common";
import * as XLSX from "xlsx-js-style";
import { ExcelData } from "@src/types/models/ExcelData";
import { MainCalculation } from "@src/modules/main/manager/settings/interfaces/MainCalculation";
import { eachCustomerHeader, eachCustomerHeaderWidth, header, mainHeader, mainHeaderWidth } from "@src/config/xlsx";
import { dateToString } from "@src/utils/date";
import { Customer } from "@src/entities/customer/customer.entity";

/**
 * 엑셀 파일 생성 및 스타일링을 전담하는 서비스 클래스입니다.
 * xlsx-js-style 라이브러리를 사용하여 시트 생성, 스타일 지정, 수식 작성을 수행합니다.
 */
@Injectable()
export class ExcelService {
  /**
   * 엑셀 시트에서 공통으로 사용되는 스타일 정의 객체입니다.
   */
  private readonly STYLES = {
    CENTER: {
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    },
    TIME: {
      font: { sz: '11' },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    },
    NUMBER: {
      numFmt: '#,###',
      alignment: { horizontal: 'right', vertical: 'center' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      }
    },
    CURRENCY_FMT: '#,##0.0'
  };

  /**
   * 정산 데이터를 바탕으로 엑셀 워크북(Workbook)을 생성합니다.
   * 
   * @param displayData 기간정산 시트에 표시할 주문 상세 데이터
   * @param allData 전체정보 시트에 표시할 고객별 통계 데이터
   * @param params 요약 정보 및 기간 (시작/종료일, 미수, 총잔액 등)
   * @returns 구성된 XLSX.WorkBook 객체
   */
  generateWorkbook(
    displayData: ExcelData[],
    allData: MainCalculation[],
    params: { start: string, end: string, misu: number, totalCredit: number, usedPointTotal: number, totalPoint: number },
    customers: Customer[] = [],
    startString: string = '',
    endString: string = ''
  ): XLSX.WorkBook {
    const wb = XLSX.utils.book_new();
    
    this.addSummarySheet(wb, displayData, params);
    this.addAllCustomerSheet(wb, allData);
    
    // 고객별 시트 생성
    if (customers.length > 0) {
      this.addEachCustomerSheets(wb, displayData, allData, customers, startString, endString);
    }
    
    return wb;
  }

  /**
   * '기간정산' 시트를 생성하여 워크북에 추가합니다.
   * 상단에 요약 통계를 표시하고 하단에 상세 주문 내역을 나열합니다.
   */
  private addSummarySheet(wb: XLSX.WorkBook, displayData: ExcelData[], params: any) {
    const { start, end, misu, totalCredit, usedPointTotal, totalPoint } = params;
    let numbering = 0;
    const length = displayData.length;

    const dataRows = displayData.map((row) => {
      const cancelled = row.price === '취소됨';
      const p = this.getTheme(cancelled);
      const t = this.getTheme(cancelled, row.menu === 0);
      const q = { ...this.getTheme(cancelled, row.menu === 0, true), numFmt: '#,###' };
      numbering++;

      const priceValue = row.price === null ? '' : (cancelled ? '취소됨' : parseInt(row.price));

      return [
        { v: numbering, t: "n", s: p },
        { v: row.customer_name, t: "s", s: { ...p, fill: { fgColor: { rgb: `${row.hex === 'FFFFFF' ? '00' : 'FF'}${row.hex}` } } } },
        { v: row.menu_name, t: "s", s: t },
        { v: priceValue, t: cancelled ? "s" : "n", s: q },
        { v: row.order_time ? dateToString(new Date(row.order_time)) : '', t: "s", s: p },
        { v: row.path ?? '', t: "s", s: p },
        { v: row.delivered_time ? dateToString(new Date(row.delivered_time)) : '', t: "s", s: p },
        { v: row.credit_by ?? '', t: "s", s: p },
        { v: row.disposal_time ? dateToString(new Date(row.disposal_time)) : '', t: "s", s: p },
        { v: row.disposal_manager ?? '', t: "s", s: p },
        { v: row.master_time ? dateToString(new Date(row.master_time)) : '', t: "s", s: p },
        { v: row.master_manager ?? '', t: "s", s: p },
        { v: row.point_amt && !isNaN(parseInt(row.point_amt)) ? parseInt(row.point_amt) * 100 : '', t: "n", s: q },
        { v: this.getIn(row), t: "n", s: q },
        { v: this.getMethod(row), t: "s", s: p },
        { v: row.memo, t: "s", s: p },
        { v: row.bigo ?? '', t: "s", s: p }
      ];
    });

    const summaryHeader = [
      { v: `${start} ~ ${end}`, t: "s", s: this.STYLES.TIME },
      {}, {},
      { v: '수량', t: "s", s: this.STYLES.CENTER },
      { v: '금액', t: "s", s: this.STYLES.CENTER },
      { v: '미수', t: "s", s: this.STYLES.CENTER },
      { v: '입금액', t: "s", s: this.STYLES.CENTER },
      { v: '합계', t: "s", s: this.STYLES.CENTER },
      { v: '총잔액', t: "s", s: this.STYLES.CENTER },
      { v: '적립금', t: "s", s: this.STYLES.CENTER },
      { v: '적립금 사용', t: "s", s: this.STYLES.CENTER },
      { v: '적립금잔액', t: "s", s: this.STYLES.CENTER },
    ];

    const sNum = { ...this.STYLES.CENTER, numFmt: this.STYLES.CURRENCY_FMT };
    const summaryValue = [
      {}, {}, {},
      { f: `SUBTOTAL(104, A5:A${length + 4})`, t: "n", s: this.STYLES.CENTER },
      { f: `(SUBTOTAL(109, D5:D${length + 4}))/1000`, t: "n", s: sNum },
      { v: misu / 1000, t: "n", s: sNum },
      { f: `(SUBTOTAL(109, N5:N${length + 4}))/1000`, t: "n", s: sNum },
      { f: 'E2+F2-G2', t: "n", s: sNum },
      { v: totalCredit / 1000, t: "n", s: sNum },
      { f: `(SUBTOTAL(109, M5:M${length + 4}))/1000`, t: "n", s: sNum },
      { v: usedPointTotal / 1000, t: "n", s: sNum },
      { v: totalPoint / 100, t: "n", s: sNum },
    ];

    const ws = XLSX.utils.aoa_to_sheet([summaryHeader, summaryValue, [], header, ...dataRows]);
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }];
    const colsWidth = this.fitToColumn([summaryHeader, summaryValue, [], header, ...dataRows]);
    colsWidth[0] = { wch: 5 };
    ws['!cols'] = colsWidth;
    ws['!autofilter'] = { ref: 'A4:R4' };
    ws['!freeze'] = { ySplit: 2 };

    XLSX.utils.book_append_sheet(wb, ws, '기간정산');
  }

  /**
   * '전체정보' 시트를 생성하여 워크북에 추가합니다.
   * 고객별 총액, 미수, 입금액 등의 집계 데이터를 표시합니다.
   */
  private addAllCustomerSheet(wb: XLSX.WorkBook, mainSheetData: MainCalculation[]) {
    const length = mainSheetData.length;
    const data = mainSheetData.map((row, i) => {
      const ret: any[] = [
        { v: row.name, t: 's' },
        { v: row.tel, t: 's' },
        { v: row.price, t: 'n' },
        { v: row.misu, t: 'n' },
        { v: row.deposit_amt, t: 'n' },
        { v: row.sum, t: 'n' },
        { v: row.total_credit, t: 'n' },
        { v: row.cnt, t: 'n' },
        { v: row.bigo, t: 's' },
      ];

      ret.forEach((cell, index) => {
        cell.s = this.getColoredTheme(i);
        if (index >= 2 && index <= 6) cell.s.numFmt = '#,###';
      });

      if (row.hex !== 'FFFFFF') ret[0].s.fill = { fgColor: { rgb: `FF${row.hex}` } };
      return ret;
    });

    const sBold = { font: { bold: true } };
    const topRow = [
      { v: '', t: 's' }, { v: '', t: 's' },
      { f: `SUBTOTAL(109, C3:C${length + 5})`, t: 'n', s: { ...sBold, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, D3:D${length + 5})`, t: 'n', s: { ...sBold, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, E3:E${length + 5})`, t: 'n', s: { ...sBold, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, F3:F${length + 5})`, t: 'n', s: { ...sBold, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, G3:G${length + 5})`, t: 'n', s: { ...sBold, numFmt: '₩#,###'} },
      { f: `SUBTOTAL(109, H3:H${length + 5})`, t: 'n', s: sBold },
      { v: '', t: 's' },
    ];

    const ws = XLSX.utils.aoa_to_sheet([topRow, mainHeader, ...data]);
    ws['!cols'] = mainHeaderWidth;
    ws['!autofilter'] = { ref: 'A2:I2' };
    XLSX.utils.book_append_sheet(wb, ws, '전체정보');
  }

  /**
   * 데이터의 길이에 따라 엑셀 컬럼의 너비를 계산합니다.
   * 한글의 경우 가중치를 주어 너비를 더 넓게 설정합니다.
   */
  private fitToColumn(arrayOfArray: any[][]) {
    const maxCols = Math.max(...arrayOfArray.map(row => row.length));
    const widths = [];
    for (let i = 0; i < maxCols; i++) {
      const maxWidth = Math.max(...arrayOfArray.map(row => {
        const cell = row[i];
        if (!cell) return 0;
        const cellValue = cell.v !== undefined ? cell.v : cell;
        if (cellValue === null || cellValue === undefined) return 0;
        const text = cellValue.toString();
        const isKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(text);
        return text.length * (isKorean ? 2.0 : 1.2); 
      }));
      widths.push({ wch: Math.max(10, maxWidth + 2) });
    }
    return widths;
  }

  /**
   * 취소 여부 및 메뉴 상태에 따른 셀 테마(글자색, 굵기 등)를 생성합니다.
   */
  private getTheme(isCancelled: boolean, isMenuZero?: boolean, alignRight?: boolean) {
    const theme: any = { font: {}, alignment: {} };
    if (isCancelled) theme.font.color = { rgb: "FFAA0000" };
    if (isMenuZero) theme.font.bold = true;
    if (alignRight) theme.alignment.horizontal = "right";
    return theme;
  }

  /**
   * 행 번호에 따라 교차 배경색이 적용된 테마를 생성합니다.
   */
  private getColoredTheme(index: number) {
    return {
      fill: { fgColor: { rgb: index % 2 === 0 ? 'FFB7DEE8' : 'FFDAEEF3' } },
      border: {
        top: { color: { rgb: 'FFFFFFFF' } },
        bottom: { color: { rgb: 'FFFFFFFF' } },
        left: { color: { rgb: 'FFFFFFFF' } },
        right: { color: { rgb: 'FFFFFFFF' } },
      }
    };
  }

  /**
   * 주문 행에서 입금액을 추출합니다. (신용, 그릇수거, 마스터 중 우선순위 적용)
   */
  private getIn(row: ExcelData) {
    if (row.credit_in && !isNaN(parseInt(row.credit_in))) return parseInt(row.credit_in);
    if (row.disposal_in && !isNaN(parseInt(row.disposal_in))) return parseInt(row.disposal_in);
    if (row.master_in && !isNaN(parseInt(row.master_in))) return parseInt(row.master_in);
    return '';
  }

  /**
   * 입금 방식에 따른 상태 텍스트를 반환합니다.
   */
  private getMethod(row: ExcelData) {
    if (parseInt(row.credit_in) !== 0 && !isNaN(parseInt(row.credit_in))) return '배달완료';
    if (parseInt(row.disposal_in) !== 0 && !isNaN(parseInt(row.disposal_in))) return '그릇수거';
    if (parseInt(row.master_in) !== 0 && !isNaN(parseInt(row.master_in))) return '마스터';
    return '';
  }

  /**
   * 각 고객별 워크시트를 생성하여 워크북에 추가합니다.
   * 고객명을 시트명으로 하여 고객별 상세 정산 정보를 표시합니다.
   */
  private addEachCustomerSheets(
    wb: XLSX.WorkBook,
    excelData: ExcelData[],
    allData: MainCalculation[],
    customers: Customer[],
    startDate: string,
    endDate: string
  ) {
    for (const customer of customers) {
      const orders = excelData.filter((data) => data.customer === customer.id);
      if (orders.length === 0) continue; // 주문 데이터가 없으면 스킵

      const summary = allData.find((data) => data.id === customer.id);
      if (!summary) continue; // 요약 데이터가 없으면 스킵

      let numbering = 0;
      const data = orders.map((row) => {
        const cancelled = row.price === '취소됨';
        const p = this.getTheme(cancelled);
        const t = this.getTheme(cancelled, row.menu === 0);
        const q = this.getTheme(cancelled, row.menu === 0, true);
        q.numFmt = '#,###';

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
        ];
      });

      const p = { alignment: { horizontal: 'center' } };
      const q = {
        ...p,
        numFmt: '₩#,##0.0'
      };

      const sTime = {
        ...p,
        font: { sz: '11' }
      };

      const formattedStart = startDate.substring(0, 10);
      const formattedEnd = endDate.substring(0, 10);

      // 기간정산 탭과 동일한 12개 컬럼 헤더
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

      // 쿼리에서 가져온 요약 값 매핑
      const title2 = [
        {}, {}, {},
        { v: summary.cnt, t: 'n', s: p },
        { v: summary.price / 1000, t: 'n', s: q },
        { v: summary.misu / 1000, t: 'n', s: q },
        { v: (Number(summary.deposit_amt)) / 1000, t: 'n', s: q },
        { v: summary.sum / 1000, t: 'n', s: q },
        { v: summary.total_credit / 1000, t: 'n', s: q },
        { v: summary.earned_point ? summary.earned_point / 1000 : 0, t: 'n', s: q },
        { v: summary.used_point ? summary.used_point / 1000 : 0, t: 'n', s: q },
        { v: summary.point_balance ? summary.point_balance / 1000 : 0, t: 'n', s: q },
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
        console.error(`고객 ${customer.name} 시트 생성 중 오류:`, e);
      }
    }
  }
}
