# Karaoke Studio

FLASHPOP Studio được chuyển thành dự án Karaoke Studio trong repository hiện tại.

## Chạy thử
- Mở thư mục `public` bằng VS Code và dùng Live Server, hoặc triển khai site tĩnh bằng HTTPS.
- Dán link YouTube công khai có cho phép nhúng.
- Nhấn **Bật micro** và cấp quyền trình duyệt để thử dò cao độ.
- Micro cần HTTPS hoặc localhost.

## Đã có trong MVP
- Giao diện responsive phong cách Y2K neon tím hồng.
- Nhúng video YouTube từ link watch, youtu.be, shorts và live.
- Dò nốt/cao độ micro bằng Web Audio API và hiển thị tần số/độ lệch cent.
- Micro không tự phát ra loa, giảm nguy cơ hú.

## Chưa có
- Auto-Tune / pitch correction thật theo thời gian thực.
- Nghe monitor micro qua tai nghe, reverb.
- Tìm kiếm YouTube bằng API, tài khoản, lưu bài yêu thích.
- Dò quãng giọng tự động.

## Lộ trình
1. Kiểm thử YouTube player và tuner trên trình duyệt thật.
2. Tích hợp pitch-shifting thời gian thực (AudioWorklet/DSP) cùng lựa chọn key/scale.
3. Thêm monitor tai nghe và hiệu ứng vang có kiểm soát.
4. Cân nhắc YouTube Data API với API key, quota và tuân thủ điều khoản.
5. Thêm tài khoản sau khi trải nghiệm hát ổn định.

Lưu ý: Một số video YouTube chặn nhúng. Bộ dò cao độ là bản cơ bản, không phải thiết bị phòng thu.
