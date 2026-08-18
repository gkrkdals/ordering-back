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
import * as fs from "node:fs";
import { MainCalculation } from "@src/modules/main/manager/settings/interfaces/MainCalculation";
import { Customer } from "@src/entities/customer/customer.entity";
import { ExcelService } from "./excel.service";

/**
 * 정산 관련 비즈니스 로직을 담당하는 서비스 클래스입니다.
 * 데이터베이스에서 정산 데이터를 조회하고 가공하여 엑셀 생성을 요청합니다.
 */
@Injectable()
export class CalculationService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    private readonly excelService: ExcelService,
  ) {}

  /**
   * 지정된 조건에 따라 정산 데이터를 조회하고 엑셀 파일을 생성하여 응답 스트림으로 전송합니다.
   * 
   * @param params 정산 조회 조건 (메뉴, 타입, 시작일, 종료일)
   * @param res Express 응답 객체
   */
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
    const menuParam = b === 2 ? menu : null;
    const customerParam = null;

    // 1. 데이터 조회 및 가공 (비즈니스 로직)
    const { displayData, allData, summaryParams } = await this.prepareCalculationData(startString, endString, menuParam?.toString() || null, customerParam, start, end);

    // 2. 고객 정보 조회
    const customers = await this.customerRepository.find({
      relations: {
        categoryJoin: true
      },
      order: {
        name: 'ASC'
      }
    });

    // 3. 엑셀 생성 (ExcelService 위임) - 고객 정보 포함
    const wb = this.excelService.generateWorkbook(displayData, allData, summaryParams, customers, startString, endString);

    // 4. 파일로 저장 후 스트림 응답
    const filename = 'calculation.xlsx';
    XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary' });

    const stream = fs.createReadStream(filename);
    stream.pipe(res);
  }

  /**
   * 데이터베이스에서 정산에 필요한 다양한 통계 및 상세 데이터를 조회합니다.
   * 
   * @param start DB 조회용 시작 날짜 문자열
   * @param end DB 조회용 종료 날짜 문자열
   * @param menu 메뉴 필터링 파라미터
   * @param customer 고객 필터링 파라미터
   * @param startParam 요청온 시작 날짜 원본 (엑셀 표시용)
   * @param endParam 요청온 종료 날짜 원본 (엑셀 표시용)
   * @returns 조회된 정산 데이터 및 요약 파라미터 객체
   */
  private async prepareCalculationData(start: string, end: string, menu: string | null, customer: string | null, startParam: string, endParam: string) {
    const excelData: ExcelData[] = await this.orderRepository.query(
      SettingsSql.getOrdinaryData,
      [
        start, end, customer, customer, menu, menu,
        start, end, customer, customer, // 그릇수거 입금
        start, end, customer, customer, // 그릇수거 적립 (입금 없는 건)
        start, end, customer, customer, // 마스터입금 (order_code=0)
        start, end, start, customer, customer,
        start, end, customer, customer,
      ]
    );

    const displayData = excelData.filter(row => row.memo !== '저억리입그음');
    const usedPointTotal = excelData
      .filter(row => row.memo === '저억리입그음')
      .reduce((sum, row) => sum + (Number(row.point_amt) || 0), 0) * -1;

    const totalPoint = (await this.orderRepository.query(SettingsSql.getTotalPoint))[0]?.total_point || 0;
    const misu = (await this.orderRepository.query(SettingsSql.getMisu, [start, menu, menu]))[0]?.misu || 0;
    const totalCredit = (await this.orderRepository.query(SettingsSql.getTotalCredit))[0]?.total_credit || 0;
    const earnedPointTotal = Number((await this.orderRepository.query(SettingsSql.getEarnedPointTotal, [start, end]))[0]?.earned_point) || 0;

    const allData: MainCalculation[] = await this.orderRepository.query(
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

    return {
      displayData,
      allData,
      summaryParams: {
        start: startParam,
        end: endParam,
        misu,
        totalCredit,
        usedPointTotal,
        totalPoint,
        earnedPointTotal
      }
    };
  }
}
