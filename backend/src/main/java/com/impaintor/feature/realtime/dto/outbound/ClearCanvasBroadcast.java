package com.impaintor.feature.realtime.dto.outbound;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Borrado de canvas verificado que se reenvía a {@code /topic/room.{code}.draw}. */
public record ClearCanvasBroadcast(
        @JsonProperty("type") String type,
        @JsonProperty("playerId") Long playerId
) {
    public ClearCanvasBroadcast(Long playerId) {
        this("CLEAR", playerId);
    }
}
