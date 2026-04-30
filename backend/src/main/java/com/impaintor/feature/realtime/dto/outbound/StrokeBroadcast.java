package com.impaintor.feature.realtime.dto.outbound;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.impaintor.feature.realtime.dto.inbound.Point;

/** Trazo verificado que se reenvía a {@code /topic/room.{code}.draw}. */
public record StrokeBroadcast(
        @JsonProperty("type") String type,
        @JsonProperty("playerId") Long playerId,
        @JsonProperty("points") List<Point> points,
        @JsonProperty("color") String color,
        @JsonProperty("thickness") int thickness
) {
    public StrokeBroadcast(Long playerId, List<Point> points, String color, int thickness) {
        this("STROKE", playerId, points, color, thickness);
    }
}
