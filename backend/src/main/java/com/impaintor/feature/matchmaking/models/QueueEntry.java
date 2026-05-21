package com.impaintor.feature.matchmaking.models;

import java.time.Instant;

public record QueueEntry(Long userId, int elo, Instant joinedAt) {}
