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
  { v: '완료 및 입금 시간', t: 's', s: mainHeaderStyle },
  { v: '관리자', t: 's', s: mainHeaderStyle },
  { v: '입금액', t: 's', s: mainHeaderStyle },
  { v: '비고', t: 's', s: mainHeaderStyle },
];

const headerTheme1 = {
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

const headerTheme2 = {
  fill: {
    fgColor: {
      rgb: 'FF4BAABF'
    }
  },
  font: {
    bold: true,
    color: {
      rgb: 'FFFF0000'
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
  { v: '이름', t: 's', s: headerTheme1 },
  { v: '휴대폰', t: 's', s: headerTheme1 },
  { v: '수', t: 's', s: headerTheme1 },
  { v: '금액', t: 's', s: headerTheme1 },
  { v: '미수', t: 's', s: headerTheme1 },
  { v: '합계', t: 's', s: headerTheme1 },
  { v: '입금일', t: 's', s: headerTheme1 },
  { v: '입금자', t: 's', s: headerTheme1 },
  { v: '입금액', t: 's', s: headerTheme2 },
  { v: '잔액', t: 's', s: headerTheme2 },
  { v: '비고', t: 's', s: headerTheme1 },
]

export const mainHeaderWidth = [
  { wch: 22 },
  { wch: 15 },
  { wch: 6 },
  { wch: 10 },
  { wch: 10 },
  { wch: 15 },
  { wch: 10 },
  { wch: 10 },
  { wch: 10 },
  { wch: 15 },
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

export const eachCustomerHeader = [
  { v: '고객명', t: 's', s: eachCustomerHeaderTheme },
  { v: '메뉴', t: 's', s: eachCustomerHeaderTheme },
  { v: '가격', t: 's', s: eachCustomerHeaderTheme },
  { v: '주문시간', t: 's', s: eachCustomerHeaderTheme },
  { v: '주문경로', t: 's', s: eachCustomerHeaderTheme },
];

export const eachCustomerHeaderWidth = [
  { wch: 20 },
  { wch: 20 },
  { wch: 10 },
  { wch: 18 },
  { wch: 20 },
]