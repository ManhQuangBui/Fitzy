# Kịch bản chạy và demo VNPay

Chạy các lệnh bên dưới trong PowerShell tại thư mục `D:\doanminh\Fitzy`.
Giữ các terminal đang chạy mở suốt buổi demo.

## 1. Chuẩn bị

- Cần Node.js/npm, ngrok, MongoDB và điện thoại có app/Expo Go.
- MongoDB phải chạy dạng **replica set**; có thể dùng MongoDB Atlas. Cách tạo replica set local xem `README.md`.
- Kiểm tra `MONGODB_URI` trong `FITZY-API/.env` trỏ đúng database.
- Nếu máy đã cài dependencies và có dữ liệu demo thì bỏ qua hai lệnh sau:

```powershell
npm install
npm run seed --workspace fitzy-api
```

Seed cần `SEED_ADMIN_PASSWORD` trong `.env`. Dùng tài khoản khách hàng để đặt đơn; tài khoản admin để xem đơn ở trang quản trị. Giữ cấu hình Firebase đã có để app đăng nhập.

## 2. Chạy ngrok và kiểm tra link

Terminal 1:

```powershell
ngrok http 4000
```

Copy địa chỉ HTTPS ở dòng **Forwarding**. Link đã dùng trước đây:
`https://snooper-jokingly-designed.ngrok-free.dev`

Nếu ngrok trả link khác, thay domain trong cả ba chỗ dưới đây bằng link mới:

**`FITZY-API/.env`** — giữ nguyên merchant code và secret đã điền:

```dotenv
VNPAY_TMN_CODE=E8M7RQCX
# Giữ VNPAY_HASH_SECRET đã lưu, không thay bằng dòng mẫu.
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=https://snooper-jokingly-designed.ngrok-free.dev/api/payments/return/vnpay
VNPAY_IPN_URL=https://snooper-jokingly-designed.ngrok-free.dev/api/payments/ipn/vnpay
FITZY_PAYMENT_RETURN_URL=fitzy://payment-result
```

**`FITZY-Mobile/.env`**:

```dotenv
EXPO_PUBLIC_API_URL=https://snooper-jokingly-designed.ngrok-free.dev/api
```

**Trang VNPay SIT**: https://sandbox.vnpayment.vn/vnpaygw-sit-testing/ipn

- Đăng nhập bằng tài khoản sandbox đã đăng ký.
- Chọn terminal `E8M7RQCX`, điền IPN giống `VNPAY_IPN_URL`, bấm **Cập nhật** và kiểm tra giá trị đã lưu.
- **Không cần đăng ký Return URL ở SIT**: API tự gửi `vnp_ReturnUrl` khi tạo giao dịch.

## 3. Chạy API, app và Admin

Sau khi lưu `.env`, mở các terminal riêng tại thư mục gốc:

| Terminal | Lệnh | Mục đích |
|---|---|---|
| 2 | `npm run api` | Chạy API cổng 4000; chờ kết nối MongoDB thành công |
| 3 | `npm run mobile:clear` | Chạy Expo và nạp lại URL API; quét QR để mở app |
| 4 | `npm run admin` | Mở địa chỉ Vite hiển thị trong terminal để xem đơn |

Nếu API/Expo đang chạy trước lúc sửa `.env`, dừng bằng `Ctrl+C` rồi chạy lại hai lệnh tương ứng. Không dừng ngrok. Admin cần URL API trong `FITZY-Admin/.env` trỏ đúng API; chạy trên cùng máy có thể dùng `VITE_API_URL=http://localhost:4000/api`.

## 4. Kiểm tra trước khi demo

Mở hai link sau, thay domain nếu tunnel đã đổi:

- `https://snooper-jokingly-designed.ngrok-free.dev/api/health` → API trả thành công.
- `https://snooper-jokingly-designed.ngrok-free.dev/api/payments/methods` → có `vnpay` trong danh sách.

Mở IPN trực tiếp mà thấy `RspCode: "97"` là bình thường vì yêu cầu đó không có chữ ký VNPay. Đây chỉ là kiểm tra endpoint truy cập được, chưa chứng minh giao dịch thành công.

## 5. Điền gì để thanh toán thử?

Trong app: đăng nhập khách hàng → chọn sản phẩm còn hàng → thêm giỏ → nhập địa chỉ và số điện thoại hợp lệ → chọn **VNPay** → đặt đơn → chọn **Thẻ nội địa / NCB** trên cổng thanh toán.

| Trường | Giá trị test |
|---|---|
| Ngân hàng | NCB |
| Số thẻ | `9704198526191432198` |
| Tên chủ thẻ | `NGUYEN VAN A` |
| Ngày phát hành | `07/15` |
| OTP | `123456` |

Dùng thẻ test trên domain `sandbox.vnpayment.vn`: không chuyển tiền thật, không nhập thẻ thật.

## 6. Kết quả cần thấy

1. Hoàn tất OTP, cổng báo thanh toán thành công.
2. VNPay gọi IPN; đơn chuyển sang **Đã thanh toán** trên app/API.
3. Mở cùng mã đơn trong Admin, kiểm tra **Đã thanh toán**.
4. Thử một đơn khác rồi hủy tại cổng: đơn không được chuyển thành đã thanh toán.

App development/release có đăng ký scheme `fitzy` sẽ mở màn hình kết quả khi trình duyệt quay về. **Expo Go không đăng ký scheme này**: nếu không tự mở app được, quay lại app thủ công → chi tiết đơn → **Kiểm tra trạng thái thanh toán**. IPN vẫn chạy độc lập với việc quay về app.

Nếu thanh toán thành công nhưng đơn vẫn chờ: kiểm tra domain ngrok, URL IPN đã lưu ở SIT và log terminal API; ghi lại mã đơn để đối chiếu. Đơn online chưa thanh toán hết hạn sau 15 phút; tạo đơn mới khi demo lại.

## 7. Kiểm thử code (tùy chọn, trước buổi demo)

```powershell
npm test
npm run lint
```

Các lệnh này kiểm tra code; chúng không thực hiện giao dịch qua VNPay. Không đóng terminal ngrok/API/Expo giữa buổi demo; nếu máy ngủ, mất mạng hoặc tắt tiến trình thì dịch vụ có thể gián đoạn.
