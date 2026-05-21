package com.impaintor.feature.realtime.dto.outbound;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MatchFoundNotification(
        @JsonProperty("type") String type,
        @JsonProperty("roomCode") String roomCode
) {
    public MatchFoundNotification(String roomCode) {
        this("MATCH_FOUND", roomCode);
    }
}
