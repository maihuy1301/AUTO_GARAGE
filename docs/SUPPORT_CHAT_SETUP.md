# Chat khách mobile và tiếp tân — hướng 1

## Việt hóa bảng chat hỗ trợ — 11/10/2026

- Đã áp `V08__support_chat_vietnamese_names.sql` vào SQL Server Docker local: `SupportConversation` → `HoiThoaiHoTro`, `SupportMessage` → `TinNhanHoTro`, `SupportReadCursor` → `TrangThaiDocHoTro`; đổi 19 tên cột theo đề xuất.
- Theo yêu cầu người dùng, giữ tên `customerId`/`agentId` và khóa ngoại tới `NguoiDung.MaNguoiDung`. API/DTO, tên class Java và trạng thái BOT/WAITING/HUMAN giữ nguyên; JPA dùng tên SQL mới.
- Fresh install dùng `database/GarageManagementSystem.sql`; DB đã áp V05 cần áp V08 một lần. Không chạy lại schema tổng trên database có dữ liệu. V05 giữ nguyên để lưu lịch sử migration.
- Đã chạy thử migration rồi rollback, sau đó áp thật; so sánh toàn bộ hàng trước/sau đạt, giữ 1 hội thoại, 2 tin nhắn, 2 trạng thái đọc. Các CHECK đều enabled/trusted, FK customerId/agentId đúng NguoiDung.
- 50/50 targeted backend tests đạt, gồm 1 SQL Server integration test đọc/ghi Unicode, history và read cursor với rollback. Số bản ghi sau test vẫn 1/2/2. Chưa E2E web/mobile hoặc gọi Gemini thật.
- Khởi động lại backend với source mới trước khi sử dụng chat. Không commit/push/deploy, không chạy/build Flutter.


## Trạng thái ngày 02/10/2026

Đã viết backend, web và mobile; tính năng **mặc định tắt**, đã áp migration V05 vào SQL Server local, chưa kiểm thử end-to-end/Gemini thật. Hướng 2 (nhóm nội bộ, trao đổi theo phiếu sửa chữa) chưa triển khai.

## Quy trình sử dụng

1. Khách đã đăng nhập bấm nút trợ lý ở góc dưới phải trên mobile. Khách chưa đăng nhập được chuyển qua đăng nhập với returnTo.
2. Chọn chi nhánh hỗ trợ. Mỗi khách có một cuộc chat lâu dài cho mỗi chi nhánh; mở lại giữ lịch sử.
3. Trợ lý tự động trả lời lời chào, hướng dẫn đặt lịch và đọc danh mục/giá dự kiến hiện hành. Câu hỏi ngoài phạm vi hoặc yêu cầu gặp người thật chuyển sang WAITING.
4. Tiếp tân mở `/app/chat`, lọc Chờ tiếp tân và bấm Nhận hỗ trợ. Một người phụ trách tại một thời điểm. Các nhân viên FRONT_DESK/MANAGER cùng chi nhánh được đọc để phối hợp; chỉ người phụ trách được gửi hoặc kết thúc lượt hỗ trợ. ADMIN có phạm vi toàn hệ thống.
5. Trong HUMAN, bot không trả lời. Kết quả AI đến muộn bị loại nếu khách đã chuyển tiếp tân hoặc có yêu cầu bot mới.
6. Khách bấm Đặt lịch ngay trong chat, mở form hiện hữu trong sheet, giới hạn chi nhánh theo phòng. Khách kiểm tra xe, dịch vụ, ngày giờ, ghi chú rồi xác nhận gửi. Backend gọi AppointmentService; lịch vẫn chờ tiếp tân xác nhận. Tin hệ thống ghi mã lịch vào chat. Retry cùng mã yêu cầu không tạo lịch mới.
7. Tiếp tân bấm Kết thúc hỗ trợ để trả lại BOT; lịch sử không bị xóa. Khách luôn có thể yêu cầu gặp tiếp tân lần nữa.

## Database đã được duyệt và áp local

Người dùng duyệt ngày 02/10/2026. Đã áp `database/migrations/V05__support_chat.sql` vào `GarageManagementSystem` trong container `garage-sqlserver` (cổng 1433), đồng bộ `database/GarageManagementSystem.sql`. Script chỉ thêm:

| Bảng | Mục đích |
| --- | --- |
| SupportConversation | Khách, chi nhánh, nhân viên phụ trách, BOT/WAITING/HUMAN, yêu cầu bot đang xử lý |
| SupportMessage | Tin người/bot/hệ thống, thời gian, mã chống gửi trùng, mã lịch và dấu vân tay yêu cầu đặt lịch |
| SupportReadCursor | Mốc đã đọc riêng của từng người trong từng cuộc chat |

Không sửa/xóa CuocHoiThoai/TinNhan hiện có, không tự chuyển lịch sử cũ vào luồng hỗ trợ mới. Tách bảng ở giai đoạn này để không làm thay đổi quyền và định dạng API chat cũ. Không giả định đã triển khai kiến trúc nhóm chat ở hướng 2.

Đã xác minh bảng, khóa ngoại, unique/check constraints và số dòng các bảng cũ không thay đổi. Kiểm tra ghi/đọc Unicode, BOT → WAITING → HUMAN → BOT và read cursor trong transaction đạt; toàn bộ dữ liệu thử rollback, ba bảng chat còn rỗng. Script dừng nếu bảng đã tồn tại; không chạy lại migration đã áp. Không chạy toàn bộ schema chuẩn trên DB đang có dữ liệu vì file chứa lệnh DELETE dùng thử từ trước. Hibernate vẫn `ddl-auto=none`.

## Cấu hình backend

Chỉ bật sau khi schema đã được duyệt và áp thành công. Backend tự đọc `.env` ở gốc repository khi chạy từ gốc hoặc thư mục `backend/`. Dùng `KEY=value`, không thêm dấu nháy hoặc `export`; biến môi trường của tiến trình ưu tiên hơn file. File `.env` được Git bỏ qua. Điền key/model, đổi `GARAGE_SUPPORT_GEMINI_ENABLED=true` rồi khởi động lại backend. Không cần gõ `$env` mỗi lần. File `.env` local đã bật `GARAGE_SUPPORT_ENABLED=true`; cấu hình mặc định khi không có file vẫn tắt:

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| GARAGE_SUPPORT_ENABLED | false | Bật REST và giao diện hỗ trợ sau migration |
| GARAGE_SUPPORT_GEMINI_ENABLED | false | Cho phép backend gọi Gemini cho câu hỏi ngoài FAQ |
| GEMINI_API_KEY | rỗng | Key chỉ đặt tại backend; không gửi vào chat, source, Flutter hoặc React |
| GEMINI_MODEL | rỗng | Tên model được tài khoản cấp hạn mức; không tự chọn model trả phí |

Không có key vẫn dùng được chat người-người, bot FAQ, đặt lịch và chuyển tiếp tân. Gemini được gọi qua `generateContent`, timeout 10 giây, tối đa 600 token đầu ra, không tự retry khi lỗi/quota. Gửi câu hỏi hiện tại và tối đa 6 tin CUSTOMER/BOT gần nhất đã che một số mẫu email/điện thoại/biển số; kèm danh mục dịch vụ, địa chỉ gara và số lịch hợp lệ theo chi nhánh. Không gửi hồ sơ khách, lịch sử sửa xe, thanh toán, tin STAFF/SYSTEM hoặc vị trí GPS lấy từ nút chia sẻ. Việc che bằng mẫu không đảm bảo loại mọi thông tin cá nhân khách tự nhập; cần đánh giá điều khoản dữ liệu trước khi bật cho khách thật. Bot không có công cụ ghi DB hoặc tự tạo lịch. Gemini Free Tier cần được kiểm tra trong AI Studio của chủ tài khoản; không bật billing tự động.

Tài liệu tham khảo: [generateContent](https://ai.google.dev/api/generate-content), [billing](https://ai.google.dev/gemini-api/docs/billing), [điều khoản dữ liệu](https://ai.google.dev/gemini-api/terms).

## API và realtime

Tất cả REST dùng JWT và ApiResponse. Prefix `/api/support-chat`:

| Method/path | Chức năng |
| --- | --- |
| GET /capabilities | Đọc enabled, không truy vấn bảng chat khi chưa migration |
| GET / | Danh sách theo khách/chi nhánh/quyền admin |
| POST / | CUSTOMER mở lại/tạo chat theo branchId đang hoạt động |
| GET /{id}/messages?before=... | Tối đa 50 tin, cờ hasMore, sắp xếp tăng dần trong trang |
| POST /{id}/messages | content tối đa 2000 ký tự, clientId chống gửi trùng |
| POST /{id}/handoff | CUSTOMER chuyển sang chờ tiếp tân |
| POST /{id}/claim | Nhận hỗ trợ với khóa hàng chống nhận đồng thời |
| POST /{id}/resolve | Người đang phụ trách kết thúc lượt hỗ trợ |
| PATCH /{id}/read | lastReadId, mốc đã đọc chỉ tăng |
| POST /{id}/appointments | CUSTOMER xác nhận đặt lịch; CreateAppointmentRequest và Idempotency-Key |

WebSocket `/ws`, STOMP CONNECT có Authorization, SUBSCRIBE `/user/queue/support-chat`. Sự kiện SUPPORT_CHANGED/SUPPORT_READ chỉ báo cần tải lại, không chứa nội dung riêng tư. Gửi sau commit cho khách và nhân viên hỗ trợ đúng chi nhánh; không broadcast nội dung chat lên topic chi nhánh. TECHNICIAN không được dùng API/kênh hỗ trợ này. Chặn SEND trực tiếp tới broker và subscribe destination không nằm trong allowlist, giữ các kênh notification/chat cũ và topic chi nhánh hợp lệ.

Web/mobile tự kết nối lại và tải lại từ REST. Fallback 15 giây trên web đang hiển thị, 20 giây trên mobile foreground; mobile dừng listener/timer khi vào nền. Mở lại tải bù, gộp theo ID. Tin của tiếp tân tạo thông báo SUPPORT_CHAT qua NotificationService/FCM hiện hữu; push thực tế phụ thuộc cấu hình Firebase và quyền thông báo thiết bị. Không khẳng định WebSocket hoạt động khi app đã đóng.

## Kiểm tra trước nghiệm thu

- Migration đã áp, bật support, restart backend; chạy web theo quy trình hiện hữu. Người dùng tự chạy Flutter.
- Đăng nhập khách mobile và tiếp tân cùng chi nhánh ở web. Kiểm tra bot FAQ, gửi hai chiều, unread, nhận hỗ trợ và kết thúc hỗ trợ.
- Mở cùng phòng bằng hai tiếp tân: chỉ một người nhận thành công. Thử khách khác, thợ, nhân viên khác chi nhánh: phải bị từ chối.
- Tắt mạng, gửi lại cùng tin, kết nối lại: không nhân đôi tin, không mất lịch sử. Đăng xuất/đổi tài khoản không để lộ nội dung cũ.
- Đặt lịch từ chat: kiểm tra trước gửi, hủy bước xác nhận không tạo lịch, gửi lại sau timeout không trùng; lịch ở quy trình chờ xác nhận.
- Thử handoff trong lúc bot đang chạy: câu trả lời bot đến muộn không được lưu/gửi.
- Bật Gemini riêng khi có key/model được chọn; thử quota/timeout và thông báo nền trên thiết bị thật.

## Giới hạn hiện tại

Chat giai đoạn này là tin văn bản, không upload ảnh/tệp, không typing/presence hoặc chuyển nhân viên phụ trách đang bận. Danh sách phòng chưa phân trang. Gemini nhận tối đa 6 tin CUSTOMER/BOT gần nhất của cùng phòng (mỗi tin tối đa 800 ký tự), kèm danh mục dịch vụ và tóm tắt chi nhánh; không gửi tin STAFF/SYSTEM. Worker AI dùng hàng đợi trong bộ nhớ; nếu backend dừng giữa chừng, khách có thể gặp tiếp tân ngay hoặc gửi lại sau 45 giây. Khi nhiều instance backend được triển khai cần broker dùng chung và cơ chế hàng đợi bền vững. Migration và SQL round trip đã kiểm tra thực tế; chưa kiểm thử tranh chấp khóa đồng thời qua backend; chưa thử Gemini thật, FCM chat trên thiết bị hay Flutter run/build.


## Gợi ý chi nhánh / GPS — 02/10/2026

- CUSTOMER mở **Tìm gara** trước hoặc trong chat, xem gợi ý lịch đặt hoặc bấm **Dùng vị trí của tôi**. Gợi ý không tự đổi phòng hoặc tự tạo lịch; khách chọn gara để mở chat đúng chi nhánh, rồi xác nhận form đặt lịch.
- GET `/api/support-chat/branch-suggestions`: backend lấy danh tính từ phiên đăng nhập, không nhận customerId. Chỉ tính DA_XAC_NHAN/DA_TIEP_NHAN/HOAN_TAT; bỏ lịch hủy, không đến và đang chờ. Sắp theo số lịch rồi thời gian hẹn mới nhất, chỉ trả chi nhánh hoạt động. Đây là lịch đặt hợp lệ, không khẳng định khách đã đến từ trạng thái xác nhận.
- POST cùng endpoint nhận latitude/longitude đã validate, xếp theo khoảng cách Haversine đường thẳng (không phải quãng đường lái xe); vị trí không nằm trong URL, không lưu DB/chat hay gửi Gemini. Khách từ chối quyền vẫn chọn thủ công. Kiểm tra phiên trước khi gửi GPS; kết quả cũ bị bỏ khi đổi tài khoản.
- `.env`: `GARAGE_SUPPORT_BRANCH_COORDINATES=`. Định dạng khi có tọa độ thật: `branchId:latitude:longitude;branchId:latitude:longitude`. Không tự gán tọa độ cho địa chỉ mẫu. Người dùng xác nhận địa chỉ Quận 1/Quận 7 hiện là mẫu: cấu hình để trống, UI thông báo chưa tính được khoảng cách; lịch đặt vẫn dùng được. Nếu chỉ một số gara có tọa độ, không khẳng định gần nhất toàn hệ thống. Không cần Google Maps API key cho phép tính này.
- Geolocator 14.0.2 và quyền vị trí foreground Android/iOS được bổ sung. Không theo dõi vị trí nền. Tham khảo: https://pub.dev/packages/geolocator . Cần người dùng chạy lại app đầy đủ sau khi thêm native plugin, hot reload không đủ. Chưa xác minh GPS trên thiết bị thật/iOS.
- Sửa phục hồi chat: mở màn tự khởi tạo lại nếu lần đăng nhập trước tải lỗi; Thử lại chạy lại cả capabilities/chi nhánh/socket; tải thành công xóa lỗi cũ. Phân biệt thông báo mất mạng, timeout, HTTP. Chưa tái hiện nguyên nhân kết nối ban đầu trên thiết bị; backend local có phản hồi 401 cho request không đăng nhập.


## Đặt lịch ngay trong hội thoại — 02/10/2026

- Khi Gemini đã bật và có key/model, câu hỏi đi qua AI trước thay vì bị FAQ bảng giá chặn. AI đọc dữ liệu xe đang hoạt động của chủ phòng (ID/hãng/model, không đưa VIN/biển số từ hồ sơ vào prompt), chi nhánh, dịch vụ và giờ Việt Nam; trả JSON text/handoff/booking. Thiếu dữ liệu thì backend lưu bản nháp và hỏi phần còn thiếu.
- Bản nháp lưu có version trong nội dung tin BOT hiện hữu; DTO chỉ trả phần văn bản để web/mobile không hiển thị JSON. Không sửa schema. Context tiếp theo đọc lại các trường bản nháp, giúp khách sửa giờ/xe/nhu cầu trước khi xác nhận.
- Khi đầy đủ, backend kiểm tra xe đúng chủ, xe/chi nhánh/dịch vụ hoạt động, ngày giờ tương lai và tạo tóm tắt bằng dữ liệu thật. Bản nháp hiệu lực 15 phút; chưa ghi DatLich.
- Khách gửi đúng Đồng ý / Xác nhận / OK (hoặc Đồng ý đặt lịch / Xác nhận đặt lịch) khi tin mới nhất là bản tóm tắt đầy đủ: backend khóa phòng, kiểm tra lại, gọi AppointmentService dưới phiên khách, tạo CHO_XAC_NHAN và tin SYSTEM có mã lịch. Có thể chọn chi nhánh hoạt động khác với phòng trong bản tóm tắt AI; form cũ vẫn giới hạn chi nhánh phòng.
- Mã booking:draft-<messageId> và mã tin client chống retry; tạo lịch, tin xác nhận và dấu chống trùng cùng transaction. Không dùng kết quả AI để tự quyết định khách đã đồng ý. Nhắn Đồng ý nhưng đổi giờ không tạo lịch mà đi qua bước sửa. Nhắn Hủy chỉ bỏ yêu cầu đang trao đổi, không hủy lịch đã lưu.
- Handoff hoặc tin mới khiến bản tóm tắt cũ không thể được xác nhận trực tiếp. Khi lịch lỗi/trùng, transaction rollback và API trả lỗi; bot không báo thành công. Khách sửa yêu cầu rồi xác nhận lại.
- Khi Gemini tắt/không có key, giữ FAQ và form dự phòng; khi provider lỗi/quota, chuyển tiếp tân. Chưa gọi Gemini thật/E2E trong lần kiểm tra này; test provider dùng HTTP mock.

## Điều chỉnh bot tư vấn — 13/10/2026

- Người dùng chốt dịch vụ + triệu chứng cơ bản + đặt lịch. Sửa prompt/FAQ, không fine-tune mô hình và không thêm bảng DB.
- Câu mở đầu như “hãy tư vấn giúp tôi”, không dấu/chữ hoa, được trả câu hỏi làm rõ tại local, handoff=false, không gọi Gemini. Triệu chứng cơ bản hỏi hãng/model và thời điểm xuất hiện, không chẩn đoán hoặc tự kê phụ tùng. Dấu hiệu nghiêm trọng chuyển hỗ trợ trực tiếp. Giá vẫn theo danh mục thật; lịch vẫn cần khách xác nhận và backend validate.
- Provider HTTP lỗi/quota, timeout hoặc JSON không hợp lệ dùng FAQ thay cho thông báo sai “ngoài khả năng”. Log chỉ HTTP status/loại exception, không log key, nội dung khách hoặc response body. Worker/context gián đoạn có thông báo riêng; bỏ lời hứa nhân viên trả lời ngay.
- Kiểm tra SupportBotServiceTest, SupportChatServiceTest, SupportBookingDraftsTest, SupportChatControllerTest đạt. Không gọi Gemini thật, chưa E2E mobile/web. Không sửa .env/application.properties/model/key hoặc database, không tự restart backend.
- Cần restart backend. Phòng đã WAITING/HUMAN cần tiếp tân xử lý và resolve về BOT theo luồng hiện hữu trước khi thử lại; không sửa DB hay xóa lịch sử.
- FAQ vẫn là từ khóa, không hiểu đầy đủ phủ định/ngữ cảnh; chất lượng Gemini thật cần nghiệm thu riêng. Bộ quy tắc và tình huống: docs/SUPPORT_BOT_PLAYBOOK.md.