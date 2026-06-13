# ToolTeams Microshop

🕐 Auto attendance tool cho Microsoft Teams Shifts - Chấm công tự động.

## Features

- ✅ Lưu MS Teams credentials local (encrypted với AES)
- ✅ Chấm công tự động 2 ca:
  - Ca sáng: 08:00 → 12:00
  - Ca chiều: 13:30 → 17:30
- ✅ Manual clock-in/out
- ✅ Xem lịch sử chấm công
- ✅ SQLite3 database (local file, chuẩn bị cho CLI)

## Quick Start

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env và set ENCRYPTION_KEY (32 ký tự random)

# Start development server
npm run dev
```

Server sẽ chạy tại: http://localhost:3000

## Testing
Run unit tests with Jest:
```bash
npm test
```

## Đăng Nhập (Tự Động)

Tool sử dụng Puppeteer để tự động đăng nhập và lấy token.

**Bước 1**: Gọi API Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@hilab.asia",
    "password": "your-password",
    "teamId": "OPTIONAL_TEAM_ID"
  }'
```
*Lưu ý: Endpoint này sẽ mở browser (headless hoặc headful tùy config) để đăng nhập và capture token.*

## Lưu Token (Thủ Công - Backup)

Nếu tự động đăng nhập thất bại, bạn có thể lưu thủ công:

**Bước 1**: Lấy Bearer token từ MS Teams (Network Tab)
**Bước 2**: Lưu vào tool
```bash
curl -X POST http://localhost:3000/api/auth/save-token \
  -H "Content-Type: application/json" \
  -d '{
    "accessToken": "eyJ0eX...",
    "teamId": "TEAM_xxx",
    "userObjectId": "xxx",
    "tenantId": "xxx"
  }'
```

## API Endpoints

### Auth (Quản lý Token)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/save-token` | Lưu MS Teams token |
| GET | `/api/auth/status` | Kiểm tra token đã lưu |
| PUT | `/api/auth/update-token` | Cập nhật token mới |
| DELETE | `/api/auth/clear` | Xóa credentials |

### Attendance (Chấm Công)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/attendance/clock-in` | Chấm công vào |
| POST | `/api/attendance/clock-out` | Chấm công ra |
| GET | `/api/attendance/status` | Trạng thái từ MS Teams |
| GET | `/api/attendance/today` | Logs hôm nay |
| GET | `/api/attendance/logs` | Lịch sử chấm công |

### Scheduler (Tự Động)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/scheduler/start` | Bật chấm công tự động |
| POST | `/api/scheduler/stop` | Tắt chấm công tự động |
| GET | `/api/scheduler/status` | Xem trạng thái scheduler |
| PUT | `/api/scheduler/config` | Cập nhật giờ chấm công |

## Cập Nhật Giờ Chấm Công

```bash
curl -X PUT http://localhost:3000/api/scheduler/config \
  -H "Content-Type: application/json" \
  -d '{
    "morningClockIn": "08:00",
    "morningClockOut": "12:00",
    "afternoonClockIn": "13:30",
    "afternoonClockOut": "17:30"
  }'
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: SQLite3 (better-sqlite3)
- **Scheduler**: node-cron
- **Encryption**: crypto-js (AES)

## Project Structure

```
src/
├── config/           # App config, database
├── core/             # Middlewares, exceptions
├── modules/
│   ├── auth/         # Token management
│   └── attendance/   # Clock in/out, scheduler
├── shared/           # Utils, constants
├── app.ts            # Express setup
└── server.ts         # Entry point
```

## License

MIT
