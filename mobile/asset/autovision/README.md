# Mô hình nhận diện hãng & dòng xe On-Device (EfficientNet-B3)

Ứng dụng Flutter sử dụng mô hình **EfficientNet-B3 (VinFast V5)** chạy trực tiếp trên thiết bị (On-Device Inference qua `tflite_flutter`) để gợi ý hãng và dòng xe từ ảnh chụp thực tế.

- **Kiến trúc mô hình**: EfficientNet-B3
- **Định dạng**: TensorFlow Lite (`car_classifier.tflite`, float32, ~45.8 MB)
- **Kích thước đầu vào (Input)**: `1 x 300 x 300 x 3` (RGB, chuẩn hóa ImageNet `mean: [0.485, 0.456, 0.406]`, `std: [0.229, 0.224, 0.225]`)
- **Đầu ra (Output)**: Vector xác suất `1 x 870` ứng với 870 lớp xe (taxonomy tiếng Anh chuẩn hóa Make / Model)
- **Cơ chế Unknown Guard**:
  - Ngưỡng xác suất tối thiểu (`min_probability`): 0.50 (50%)
  - Khoảng cách tin cậy tối thiểu giữa Top 1 và Top 2 (`min_margin`): 0.10 (10%)
  - Khi không thỏa mãn điều kiện hoặc gặp xe lạ ngoài danh mục 870 lớp, hệ thống tự động gán vào: **Hãng: "Khác"** / **Dòng xe: "Khác"**.

