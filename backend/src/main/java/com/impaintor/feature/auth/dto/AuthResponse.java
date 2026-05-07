package com.impaintor.feature.auth.dto;

import com.impaintor.feature.user.dto.UserMeResponse;

public record AuthResponse(
    String token,
    UserMeResponse user
) {
}
