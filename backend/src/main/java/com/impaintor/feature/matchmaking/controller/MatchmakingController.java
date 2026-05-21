package com.impaintor.feature.matchmaking.controller;

import com.impaintor.feature.auth.config.AppUserDetails;
import com.impaintor.feature.matchmaking.dto.MatchmakingStatusResponse;
import com.impaintor.feature.matchmaking.service.MatchmakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingService matchmakingService;

    @PostMapping("/queue")
    public MatchmakingStatusResponse joinQueue(@AuthenticationPrincipal AppUserDetails currentUser) {
        return matchmakingService.join(currentUser.getId());
    }

    @DeleteMapping("/queue")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveQueue(@AuthenticationPrincipal AppUserDetails currentUser) {
        matchmakingService.leave(currentUser.getId());
    }

    @GetMapping("/status")
    public MatchmakingStatusResponse getStatus(@AuthenticationPrincipal AppUserDetails currentUser) {
        return matchmakingService.getStatus(currentUser.getId());
    }
}
