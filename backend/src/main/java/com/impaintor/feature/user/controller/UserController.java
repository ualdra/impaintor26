package com.impaintor.feature.user.controller;

import com.impaintor.feature.auth.config.AppUserDetails;
import com.impaintor.feature.user.dto.LeaderboardEntryResponse;
import com.impaintor.feature.user.dto.UpdateMeRequest;
import com.impaintor.feature.user.dto.UserMeResponse;
import com.impaintor.feature.user.dto.UserPublicResponse;
import com.impaintor.feature.user.service.UserService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public UserMeResponse getMe(@AuthenticationPrincipal AppUserDetails currentUser) {
        return userService.getMe(currentUser.getId());
    }

    @PutMapping("/me")
    public UserMeResponse updateMe(
        @AuthenticationPrincipal AppUserDetails currentUser,
        @Valid @RequestBody UpdateMeRequest request
    ) {
        return userService.updateMe(currentUser.getId(), request);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMe(@AuthenticationPrincipal AppUserDetails currentUser) {
        userService.deleteMe(currentUser.getId());
    }

    @GetMapping("/leaderboard")
    public Page<LeaderboardEntryResponse> leaderboard(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "50") int size
    ) {
        return userService.getLeaderboard(page, size);
    }

    @GetMapping("/{id}")
    public UserPublicResponse getPublicProfile(@PathVariable Long id) {
        return userService.getPublicProfile(id);
    }
}
