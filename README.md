
# No1Food - 배달 및 주문 관리 통합 시스템 🍔
> **효율적인 매장 운영과 고객 관리를 위한 실시간 B2B/B2C 솔루션**

## 📸 화면 데모 (Visual Demonstration)
| ![Step 1](images/1.jpg) | ![Step 2](images/2.jpg) | ![Step 3](images/3.png) | ![Step 4](images/4.png) |
|:-------------------------:|:-------------------------:|:-------------------------:|:-------------------------:|
| 1. 전체적인 화면 | 2. 고객 주문 웹 서비스 | 3. 주문 상태 변경 알림 | 4. 엑셀 기반 정산 기능 |

## 💡 개발 동기 및 해결 과제 (Motivation & Problem)
식음료 매장을 운영할 때 발생하는 복잡한 주문 처리, 고객 포인트 관리, 영업 시간 설정 등의 반복적이고 소모적인 운영 리소스를 최소화하기 위해 개발되었습니다. 
이 프로젝트를 통해 **실시간 양방향 통신(WebSocket)을 이용한 즉각적인 주문 상태 동기화**와 **역할 기반(고객 vs 관리자)의 안전한 인가(Authorization) 인프라**를 구축하는 방법을 깊이 있게 학습하고 해결하고자 했습니다.

<br/>

## 📦 프로젝트 구성 (Repository Layout)
이 저장소는 세 개의 애플리케이션으로 구성되어 있습니다.

| 디렉토리 | 설명 |
|----------|------|
| `back/` | NestJS 10 + TypeORM + MySQL 기반 API 서버. Socket.io 게이트웨이, FCM 푸시, cron 스케줄링 포함 |
| `front/` | React 18 + Vite SPA. Capacitor 6로 Android 앱으로도 패키징 (`넘버원푸드`) |
| `printneworder/` | 영수증 출력을 담당하는 FastAPI(Python) 서비스 |

프론트엔드 프로덕션 빌드 결과물은 백엔드가 `back/static`에서 정적 파일로 서빙하며, 모든 API는 전역 프리픽스 `/api` 하위에 노출됩니다.

<br/>

## 🛠 기술 스택 및 도입 배경 (Tech Stack & Rationale)
- **Node.js & NestJS**: 체계적인 모듈 아키텍처와 DI(의존성 주입)를 제공하여, 복잡해지는 비즈니스 로직(주문, 결제, 알림 등)의 유지보수성과 확장성을 높이기 위해 선택했습니다.
- **TypeScript**: 정적 타입 지원으로 런타임 에러를 사전에 방지하고 엔티티 모델링의 안정성을 확보하기 위해 사용했습니다.
- **MySQL & TypeORM**: 주문 내역, 포인트 증감 등 데이터 무결성이 중요한 비즈니스 로직을 처리하고 관계형 데이터를 효율적으로 다루기 위해 채택했습니다. 복잡한 조회 쿼리는 각 모듈의 `sql/*.sql.ts` 파일에 raw SQL로 분리해 관리합니다.
- **Socket.io**: 고객이 접수한 주문이 관리자에게 새로고침 없이 실시간으로 전달되게 구현하기 위해 도입했습니다. 별도의 `WS_PORT`에서 동작하며 접속 시 `role`(customer / manager / printer)별로 클라이언트를 분리 관리합니다.
- **Firebase Cloud Messaging (FCM)**: 기기별 푸시 알림을 통해 고객에게 주문 상태 변경(조리 시작, 배달 출발 등)을 즉각적으로 알리기 위해 사용했습니다.
- **JWT (JSON Web Token)**: 서버의 세션 저장소 부하를 줄이고, 확장성 있는 Stateless 사용자 인증 체계를 구축하기 위해 활용했습니다. 토큰은 `jwt` 쿠키로 전달되며 `AuthGuard`와 `Roles` 데코레이터로 인가를 처리합니다.

<br/>

## ✨ 주요 기능 (Key Features)
- **실시간 주문 파이프라인**: Socket 통신을 활용한 실시간 주문 생성 및 상태 추적(대기 ➔ 조리중 ➔ 완료)
- **역할 기반 접근 제어 (RBAC)**: 고객(`client`)과 관리자(`manager`)의 권한 범위를 완벽히 분리하고 전용 API 제공 (관리자는 `manager` / `rider` / `cook` 역할로 세분화)
- **고객 및 크레딧/포인트 관리**: 사용자의 과거 주문 내역 바탕의 등급 관리 및 결제에 사용 가능한 포인트/크레딧 시스템
- **동적 메뉴 및 카테고리 제어**: 유동적인 메뉴 구성, 카테고리 분류, 품절/블라인드 처리 기능
- **고급 운영 설정 및 스케줄링**: `cron` 기반의 주기적인 알림 발송 및 관리자 페이지를 통한 유연한 매장 영업 시간·요일별 설정 (요일별 그릇 수거 시간 등, 상세 명세는 저장소 루트의 `API_SPECS_DISPOSAL_TIME.md` 참고)
- **데이터 추출 (엑셀 Export)**: 주문 이력 및 고객 데이터를 쉽게 분석할 수 있도록 XLSX 파일 다운로드 지원

<br/>

## 🚀 시작하기 (Getting Started Guide)
아래의 단계에 따라 로컬 환경에서 서버를 구동할 수 있습니다.

### 1. 패키지 설치
```bash
cd back
npm install
```

### 2. 환경 변수 및 인증 키 설정
미리 발급받은 Firebase 서비스 어카운트 키 인증 파일(`firebase-cert.json`)을 `back/` 루트 디렉토리에 위치시킵니다.

환경 변수는 실행 모드에 따라 별도 파일로 관리됩니다.
- 개발: `.env.development` (`npm run start:dev` 실행 시 로드)
- 운영: `.env.production` (`npm run start:prod` 실행 시 로드)

`back/` 루트에 아래 형식으로 파일을 생성합니다.
```env
DATABASE_TYPE=mysql
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE=no1food
DATABASE_USERNAME=root
DATABASE_PASSWORD=your_password

JWT_SECRET=super_secret_jwt_key
JWT_ISSUER=your_issuer

TZ=Asia/Seoul

ORIGIN=http://localhost:3000

PORT=3000
WS_PORT=8080
```
- `PORT`: HTTP API 서버 포트
- `WS_PORT`: Socket.io 게이트웨이 포트
- `ORIGIN`: CORS 허용 및 `www` 리다이렉트에 사용되는 서비스 도메인

### 3. 서버 실행
```bash
# 개발 모드로 서버 실행 (코드 변경 시 자동 재시작)
npm run start:dev
```

이외의 주요 스크립트:
```bash
npm run build       # 프로덕션 빌드 (dist/)
npm run start:prod  # 빌드 결과물 실행
npm run lint        # ESLint 검사 및 자동 수정
npm test            # Jest 단위 테스트
```

### 4. 접속 테스트
서버가 정상적으로 구동되면 브라우저에서 아래 주소로 접속해 서비스가 동작하는지 확인합니다. (정적 파일 서버 연동)
```text
http://localhost:3000
```

### 5. (선택) Docker로 실행
```bash
docker compose up --build
```
`NODE_ENV=production`으로 빌드되며 `3000`(HTTP), `8080`(WebSocket) 포트가 노출됩니다.

<br/>

## 🖥 프론트엔드 실행 (Frontend)
```bash
cd front
npm install
npm run dev            # Vite 개발 서버 (0.0.0.0:5173)
npm run build          # 프로덕션 빌드
npm run cap:sync:prod  # 빌드 후 Capacitor Android 프로젝트에 동기화
```
프론트엔드 환경 변수는 `front/.env.development` / `front/.env.production`에서 관리합니다.
(`VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_PRINTER_URL`, `VITE_MODE`)
