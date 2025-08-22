const mainHeaderStyle = {
  font: { bold: true },
  border: {
    top: { style: 'thick' },
    bottom: { style: 'thick' },
  }
}

export const header = [
  { v: '순번', t: 's', s: mainHeaderStyle },
  { v: '고객명', t: 's', s: mainHeaderStyle },
  { v: '메뉴', t: 's', s: mainHeaderStyle },
  { v: '가격', t: 's', s: mainHeaderStyle },
  { v: '주문시간', t: 's', s: mainHeaderStyle },
  { v: '주문경로', t: 's', s: mainHeaderStyle },
  { v: '배달완료시간', t: 's', s: mainHeaderStyle },
  { v: '담당자', t: 's', s: mainHeaderStyle },
  { v: '입금액', t: 's', s: mainHeaderStyle },
  { v: '그릇수거시간', t: 's', s: mainHeaderStyle },
  { v: '담당자', t: 's', s: mainHeaderStyle },
  { v: '입금액', t: 's', s: mainHeaderStyle },
  { v: '마스터입금시간', t: 's', s: mainHeaderStyle },
  { v: '담당자', t: 's', s: mainHeaderStyle },
  { v: '입금액', t: 's', s: mainHeaderStyle },
  { v: '입금경로', t: 's', s: mainHeaderStyle },
  { v: '비고', t: 's', s: mainHeaderStyle },
  { v: '메모', t: 's', s: mainHeaderStyle },
];

const headerTheme = {
  fill: {
    fgColor: {
      rgb: 'FF4BAABF'
    }
  },
  font: {
    bold: true,
    color: {
      rgb: 'FFFFFFFF'
    }
  },
  border: {
    top: { color: { rgb: 'FFFFFFFF' } },
    bottom: { color: { rgb: 'FFFFFFFF' } },
    left: { color: { rgb: 'FFFFFFFF' } },
    right: { color: { rgb: 'FFFFFFFF' } },
  }
}

export const mainHeader = [
  { v: '이름', t: 's', s: headerTheme },
  { v: '휴대폰', t: 's', s: headerTheme },
  { v: '금액', t: 's', s: headerTheme },
  { v: '미수', t: 's', s: headerTheme },
  { v: '입금액', t: 's', s: headerTheme },
  { v: '합계', t: 's', s: headerTheme },
  { v: '총 잔액', t: 's', s: headerTheme },
  { v: '수', t: 's', s: headerTheme },
  { v: '비고', t: 's', s: headerTheme },
]

export const mainHeaderWidth = [
  { wch: 22 },
  { wch: 15 },
  { wch: 13 },
  { wch: 13 },
  { wch: 13 },
  { wch: 13 },
  { wch: 13 },
  { wch: 6 },
  { wch: 18 },
]

const eachCustomerHeaderTheme = {
  font: {
    bold: true,
  },
  border: {
    top: { style: 'thick' },
    bottom: { style: 'thick' },
  }
}

// export const eachCustomerHeader = [
//   { v: '순번', t: 's', s: eachCustomerHeaderTheme },
//   { v: '고객명', t: 's', s: eachCustomerHeaderTheme },
//   { v: '메뉴', t: 's', s: eachCustomerHeaderTheme },
//   { v: '가격', t: 's', s: eachCustomerHeaderTheme },
//   { v: '주문시간', t: 's', s: eachCustomerHeaderTheme },
//   { v: '주문경로', t: 's', s: eachCustomerHeaderTheme },
//   { v: '완료 및 입금 시간', t: 's', s: eachCustomerHeaderTheme },
//   { v: '관리자', t: 's', s: eachCustomerHeaderTheme },
//   { v: '입금액', t: 's', s: eachCustomerHeaderTheme },
//   { v: '비고', t: 's', s: eachCustomerHeaderTheme },
//   { v: '메모', t: 's', s: eachCustomerHeaderTheme },
// ];

export const eachCustomerHeader = [
  { v: '순번', t: 's', s: mainHeaderStyle },
  { v: '메뉴', t: 's', s: mainHeaderStyle },
  { v: '가격', t: 's', s: mainHeaderStyle },
  { v: '주문시간', t: 's', s: mainHeaderStyle },
  { v: '주문경로', t: 's', s: mainHeaderStyle },
  { v: '배달완료시간', t: 's', s: mainHeaderStyle },
  { v: '담당자', t: 's', s: mainHeaderStyle },
  { v: '입금액', t: 's', s: mainHeaderStyle },
  { v: '그릇수거시간', t: 's', s: mainHeaderStyle },
  { v: '담당자', t: 's', s: mainHeaderStyle },
  { v: '입금액', t: 's', s: mainHeaderStyle },
  { v: '마스터입금시간', t: 's', s: mainHeaderStyle },
  { v: '담당자', t: 's', s: mainHeaderStyle },
  { v: '입금액', t: 's', s: mainHeaderStyle },
  { v: '입금경로', t: 's', s: mainHeaderStyle },
  { v: '비고', t: 's', s: mainHeaderStyle },
  { v: '메모', t: 's', s: mainHeaderStyle },
];


export const eachCustomerHeaderWidth = [
  { wch: 8 },
  { wch: 15 },
  { wch: 15 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
  { wch: 20 },
]