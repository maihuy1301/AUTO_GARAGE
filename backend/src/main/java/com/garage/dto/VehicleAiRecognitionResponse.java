package com.garage.dto;

import java.util.List;

/**
 * Response DTO cho kết quả nhận diện xe bằng AI (EfficientNet-B3).
 * Tự động ánh xạ Hãng/Dòng vào ID trong danh mục Database (kèm fallback xe 'Khác').
 */
public class VehicleAiRecognitionResponse {

    private boolean success;
    private String recognizedMake;
    private String recognizedModel;
    private Double confidence;
    private boolean isOther;
    private boolean requiresReview;
    private String displayText;
    private Integer matchedBrandId;
    private String matchedBrandName;
    private Integer matchedModelId;
    private String matchedModelName;
    private List<String> reasons;
    private List<Candidate> top5;

    public VehicleAiRecognitionResponse() {}

    public VehicleAiRecognitionResponse(boolean success, String recognizedMake, String recognizedModel,
                                       Double confidence, boolean isOther, boolean requiresReview,
                                       String displayText, Integer matchedBrandId, String matchedBrandName,
                                       Integer matchedModelId, String matchedModelName,
                                       List<String> reasons, List<Candidate> top5) {
        this.success = success;
        this.recognizedMake = recognizedMake;
        this.recognizedModel = recognizedModel;
        this.confidence = confidence;
        this.isOther = isOther;
        this.requiresReview = requiresReview;
        this.displayText = displayText;
        this.matchedBrandId = matchedBrandId;
        this.matchedBrandName = matchedBrandName;
        this.matchedModelId = matchedModelId;
        this.matchedModelName = matchedModelName;
        this.reasons = reasons;
        this.top5 = top5;
    }

    public static class Candidate {
        private String make;
        private String model;
        private String label;
        private Double probability;

        public Candidate() {}

        public Candidate(String make, String model, String label, Double probability) {
            this.make = make;
            this.model = model;
            this.label = label;
            this.probability = probability;
        }

        public String getMake() { return make; }
        public void setMake(String make) { this.make = make; }

        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }

        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }

        public Double getProbability() { return probability; }
        public void setProbability(Double probability) { this.probability = probability; }
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getRecognizedMake() { return recognizedMake; }
    public void setRecognizedMake(String recognizedMake) { this.recognizedMake = recognizedMake; }

    public String getRecognizedModel() { return recognizedModel; }
    public void setRecognizedModel(String recognizedModel) { this.recognizedModel = recognizedModel; }

    public Double getConfidence() { return confidence; }
    public void setConfidence(Double confidence) { this.confidence = confidence; }

    public boolean isOther() { return isOther; }
    public void setOther(boolean other) { isOther = other; }

    public boolean isRequiresReview() { return requiresReview; }
    public void setRequiresReview(boolean requiresReview) { this.requiresReview = requiresReview; }

    public String getDisplayText() { return displayText; }
    public void setDisplayText(String displayText) { this.displayText = displayText; }

    public Integer getMatchedBrandId() { return matchedBrandId; }
    public void setMatchedBrandId(Integer matchedBrandId) { this.matchedBrandId = matchedBrandId; }

    public String getMatchedBrandName() { return matchedBrandName; }
    public void setMatchedBrandName(String matchedBrandName) { this.matchedBrandName = matchedBrandName; }

    public Integer getMatchedModelId() { return matchedModelId; }
    public void setMatchedModelId(Integer matchedModelId) { this.matchedModelId = matchedModelId; }

    public String getMatchedModelName() { return matchedModelName; }
    public void setMatchedModelName(String matchedModelName) { this.matchedModelName = matchedModelName; }

    public List<String> getReasons() { return reasons; }
    public void setReasons(List<String> reasons) { this.reasons = reasons; }

    public List<Candidate> getTop5() { return top5; }
    public void setTop5(List<Candidate> top5) { this.top5 = top5; }
}

