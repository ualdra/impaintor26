package com.impaintor.feature.matchmaking;

import com.impaintor.feature.matchmaking.service.MatchmakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MatchmakingScheduler {

    private final MatchmakingService matchmakingService;

    @Scheduled(fixedRate = 2000)
    public void runMatchmaking() {
        matchmakingService.tryFormMatches();
    }
}
