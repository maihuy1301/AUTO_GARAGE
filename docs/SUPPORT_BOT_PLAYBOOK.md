# Quy tắc tư vấn AutoCare

Phạm vi đã chốt 13/10/2026: dịch vụ, triệu chứng cơ bản và đặt lịch. Đây là hướng dẫn prompt/FAQ và bộ tình huống nghiệm thu; không phải dữ liệu đã fine-tune mô hình.

## Luồng hội thoại

1. Khách chưa nêu nhu cầu: chào ngắn, giới thiệu khả năng và hỏi một câu làm rõ. Không chuyển người chỉ vì câu ngắn.
2. Hỏi dịch vụ/giá: chỉ dùng danh mục thật từ backend; luôn nói giá dự kiến, không tự cam kết tổng tiền hoặc phụ tùng phải thay.
3. Triệu chứng: hỏi biểu hiện, khi nào xuất hiện, hãng/model xe. Không kết luận lỗi hay hướng dẫn tháo/sửa qua chat. Dấu hiệu nghiêm trọng cần kiểm tra trực tiếp và chuyển nhân viên.
4. Muốn đặt lịch: thu thập xe, chi nhánh, ngày giờ và nhu cầu. AI chỉ tạo bản nháp; khách xác nhận, backend kiểm tra và ghi lịch. Không biến câu hỏi tư vấn thành đồng ý đặt lịch.
5. Khách yêu cầu người thật: chuyển tiếp tân, không hứa có người trả lời ngay.
6. Gemini lỗi/quota/JSON sai: dùng FAQ dự phòng; không nói khách hỏi ngoài khả năng chỉ vì provider lỗi. FAQ không tạo bản nháp từ trí nhớ và không tự ghi lịch. Lỗi worker/context phải có lời báo gián đoạn riêng.

## Tình huống kiểm tra

| Khách nhắn | Hành vi mong đợi |
|---|---|
| hãy tư vấn giúp tôi | Hỏi nhu cầu; BOT tiếp tục, không gọi provider |
| TƯ VẤN GIÚP TÔI! | Như câu có dấu/chữ thường |
| xe kêu khi đánh lái là lỗi gì? | Thu thập thông tin, không khẳng định hỏng bộ phận nào |
| xe mất phanh, chi phí bao nhiêu? | Ưu tiên an toàn và hỗ trợ trực tiếp, không báo giá suy đoán |
| tôi đang chạy xe và máy lạnh yếu | Không nhầm “chạy xe” thành “cháy xe” |
| bảng giá dịch vụ | Giá dự kiến theo danh mục đang hoạt động |
| đặt lịch ngày mai | Hỏi/thu thập thông tin hoặc hướng dẫn form; chưa tự tạo lịch |
| gặp tiếp tân hỏi dịch vụ | Chuyển người theo yêu cầu |
| provider HTTP 429 hoặc timeout | FAQ tiếp tục hỗ trợ khi có thể, không tự retry liên tục |

## Kiểm tra trên ứng dụng

Khởi động lại backend sau sửa source. Hội thoại đã WAITING/HUMAN không tự trở lại BOT: tiếp tân nhận và kết thúc hỗ trợ qua luồng hiện hữu trước khi thử bot lại. Không sửa trạng thái trực tiếp trong database. Kiểm tra cả tư vấn → đặt lịch → xác nhận và khách đổi nhu cầu giữa chừng.

## Giới hạn

FAQ là quy tắc từ khóa, không hiểu đầy đủ phủ định hoặc ngữ cảnh nhiều lượt. Gemini có recent/context hiện hữu nhưng cần kiểm thử thật bằng model được cấu hình. Kiểm thử HTTP mock không chứng minh chất lượng model thật. Không thay schema, model, API key hoặc tự gọi API trả phí trong phiên sửa này.
