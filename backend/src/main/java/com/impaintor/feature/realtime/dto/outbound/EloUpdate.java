package com.impaintor.feature.realtime.dto.outbound;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Sent privately to each player after a game ends with their individual ELO delta. */
public record EloUpdate(
        @JsonProperty("type") String type,
        @JsonProperty("eloChange") int eloChange
) {
    public EloUpdate(int eloChange) {
        this("ELO_UPDATE", eloChange);
    }
}
