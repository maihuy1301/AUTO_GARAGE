package com.garage.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.garage.dto.VehicleAiRecognitionResponse;
import com.garage.entity.HangXe;
import com.garage.entity.ModelXe;
import com.garage.exception.BadRequestException;
import com.garage.repository.HangXeRepository;
import com.garage.repository.ModelXeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class VehicleAiService {

    private static final Logger log = LoggerFactory.getLogger(VehicleAiService.class);

    private final HangXeRepository hangXeRepository;
    private final ModelXeRepository modelXeRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${garage.ai.service-url:http://localhost:8000}")
    private String aiServiceUrl;

    public VehicleAiService(HangXeRepository hangXeRepository, ModelXeRepository modelXeRepository) {
        this.hangXeRepository = hangXeRepository;
        this.modelXeRepository = modelXeRepository;
        
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(15000);
        this.restTemplate = new RestTemplate(factory);
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Nhận diện xe từ ảnh tải lên và tự động ánh xạ vào Catalog Database (HangXe / ModelXe).
     * Khi nhận diện không thành công hoặc gặp xe lạ, tự động ánh xạ vào loại xe "Khác".
     */
    @Transactional
    public VehicleAiRecognitionResponse recognize(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Tệp ảnh xe không được để trống.");
        }

        String targetUrl = aiServiceUrl + "/api/ai/recognize-car";
        JsonNode aiResult = null;

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename() != null ? file.getOriginalFilename() : "vehicle.jpg";
                }
            };
            body.add("file", resource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(targetUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                aiResult = objectMapper.readTree(response.getBody());
            }
        } catch (Exception e) {
            log.warn("Không thể kết nối đến AI Service tại {}: {}. Kích hoạt chế độ fallback chọn xe 'Khác'.", targetUrl, e.getMessage());
        }

        return mapToDatabaseCatalog(aiResult);
    }

    private VehicleAiRecognitionResponse mapToDatabaseCatalog(JsonNode aiResult) {
        boolean isOther = true;
        boolean requiresReview = true;
        String recognizedMake = "Khác";
        String recognizedModel = "Khác";
        Double confidence = 0.0;
        String displayText = "Xe lạ / Chưa xác định (Đã gán vào loại xe: Khác)";
        List<String> reasons = new ArrayList<>();
        List<VehicleAiRecognitionResponse.Candidate> top5 = new ArrayList<>();

        if (aiResult != null) {
            isOther = aiResult.path("is_other").asBoolean(true);
            requiresReview = aiResult.path("requires_review").asBoolean(true);
            recognizedMake = aiResult.path("make").asText("Khác");
            recognizedModel = aiResult.path("model").asText("Khác");
            confidence = aiResult.path("confidence").asDouble(0.0);
            displayText = aiResult.path("display_text").asText(displayText);

            JsonNode reasonsNode = aiResult.path("reasons");
            if (reasonsNode.isArray()) {
                for (JsonNode r : reasonsNode) {
                    reasons.add(r.asText());
                }
            }

            JsonNode top5Node = aiResult.path("top5");
            if (top5Node.isArray()) {
                for (JsonNode c : top5Node) {
                    top5.add(new VehicleAiRecognitionResponse.Candidate(
                            c.path("make").asText(""),
                            c.path("model").asText(""),
                            c.path("label").asText(""),
                            c.path("probability").asDouble(0.0)
                    ));
                }
            }
        } else {
            reasons.add("Dịch vụ nhận diện AI tạm thời không khả dụng, hệ thống tự động gán xe vào loại 'Khác'.");
        }

        // Tự động tìm hoặc fallback sang Hãng 'Khác' và Model 'Khác' trong SQL Server
        HangXe matchedBrand = null;
        ModelXe matchedModel = null;

        if (!isOther && !requiresReview) {
            matchedBrand = findMatchingBrand(recognizedMake);
            if (matchedBrand != null) {
                matchedModel = findMatchingModel(matchedBrand.getMaHangXe(), recognizedModel);
            }
        }

        // Nếu xe lạ hoặc không tìm thấy trong database catalog -> Gán vào loại xe 'Khác'
        if (matchedBrand == null || matchedModel == null) {
            isOther = true;
            HangXe otherBrand = getOrCreateOtherBrand();
            ModelXe otherModel = getOrCreateOtherModel(otherBrand);
            matchedBrand = otherBrand;
            matchedModel = otherModel;
            if (!reasons.contains("Dòng xe chưa có trong danh mục hoặc độ tin cậy thấp.")) {
                reasons.add("Tự động phân loại vào dòng xe 'Khác' theo cấu hình hệ thống.");
            }
        }

        return new VehicleAiRecognitionResponse(
                true,
                recognizedMake,
                recognizedModel,
                confidence,
                isOther,
                requiresReview,
                displayText,
                matchedBrand.getMaHangXe(),
                matchedBrand.getTenHangXe(),
                matchedModel.getMaModel(),
                matchedModel.getTenModel(),
                reasons,
                top5
        );
    }

    private HangXe findMatchingBrand(String makeName) {
        String normTarget = normalize(makeName);
        for (HangXe b : hangXeRepository.findByTrangThaiTrue()) {
            if (normalize(b.getTenHangXe()).equals(normTarget)) {
                return b;
            }
        }
        return null;
    }

    private ModelXe findMatchingModel(Integer brandId, String modelName) {
        String normTarget = normalize(modelName);
        for (ModelXe m : modelXeRepository.findByHangXeMaHangXeAndTrangThaiTrue(brandId)) {
            if (normalize(m.getTenModel()).equals(normTarget)) {
                return m;
            }
        }
        return null;
    }

    private HangXe getOrCreateOtherBrand() {
        for (HangXe b : hangXeRepository.findAll()) {
            String norm = normalize(b.getTenHangXe());
            if (norm.contains("khac") || norm.contains("other")) {
                return b;
            }
        }
        // Tự động khởi tạo nếu database chưa có
        HangXe newOther = new HangXe("Khác");
        newOther.setTrangThai(true);
        return hangXeRepository.save(newOther);
    }

    private ModelXe getOrCreateOtherModel(HangXe otherBrand) {
        for (ModelXe m : modelXeRepository.findByHangXeMaHangXe(otherBrand.getMaHangXe())) {
            String norm = normalize(m.getTenModel());
            if (norm.contains("khac") || norm.contains("other")) {
                return m;
            }
        }
        // Tự động khởi tạo nếu database chưa có
        ModelXe newOtherModel = new ModelXe(otherBrand, "Khác");
        newOtherModel.setTrangThai(true);
        return modelXeRepository.save(newOtherModel);
    }

    private String normalize(String s) {
        if (s == null) return "";
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]", "");
    }
}

