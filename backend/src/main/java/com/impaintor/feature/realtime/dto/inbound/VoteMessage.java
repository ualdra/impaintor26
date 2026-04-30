package com.impaintor.feature.realtime.dto.inbound;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record VoteMessage(Long votedPlayerId) {
}
