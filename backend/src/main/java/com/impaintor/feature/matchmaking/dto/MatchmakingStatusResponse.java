package com.impaintor.feature.matchmaking.dto;

public record MatchmakingStatusResponse(boolean queued, long waitSeconds, int searchRange) {}
