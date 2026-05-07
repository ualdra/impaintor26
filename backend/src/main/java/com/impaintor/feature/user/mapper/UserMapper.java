package com.impaintor.feature.user.mapper;

import com.impaintor.feature.user.dto.LeaderboardEntryResponse;
import com.impaintor.feature.user.dto.UserMeResponse;
import com.impaintor.feature.user.dto.UserPublicResponse;
import com.impaintor.feature.user.models.User;

public final class UserMapper {

    private UserMapper() {
    }

    public static UserPublicResponse toPublic(User user) {
        return new UserPublicResponse(
            user.getId(),
            user.getUsername(),
            user.getElo(),
            user.getGamesPlayed(),
            user.getGamesWon()
        );
    }

    public static UserMeResponse toMe(User user) {
        return new UserMeResponse(
            user.getId(),
            user.getEmail(),
            user.getUsername(),
            user.getElo(),
            user.getGamesPlayed(),
            user.getGamesWon(),
            user.getCreatedAt()
        );
    }

    public static LeaderboardEntryResponse toLeaderboardEntry(User user) {
        return new LeaderboardEntryResponse(
            user.getId(),
            user.getUsername(),
            user.getElo(),
            user.getGamesPlayed(),
            user.getGamesWon()
        );
    }
}
