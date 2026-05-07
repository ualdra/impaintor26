package com.impaintor.feature.user.dto;

import java.time.LocalDateTime;

public record UserMeResponse(
    Long id,
    String email,
    String username,
    Integer elo,
    Integer gamesPlayed,
    Integer gamesWon,
    LocalDateTime createdAt
) {
}
