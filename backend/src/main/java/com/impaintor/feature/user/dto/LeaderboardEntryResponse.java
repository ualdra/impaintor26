package com.impaintor.feature.user.dto;

public record LeaderboardEntryResponse(
    Long id,
    String username,
    Integer elo,
    Integer gamesPlayed,
    Integer gamesWon
) {
}
