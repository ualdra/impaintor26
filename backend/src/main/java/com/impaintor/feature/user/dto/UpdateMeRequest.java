package com.impaintor.feature.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
    @Size(min = 3, max = 30, message = "username must be between 3 and 30 chars")
    String username,
    @Size(min = 6, max = 100, message = "password must be between 6 and 100 chars")
    String password,
    @Size(max = 2, message = "countryCode must have at most 2 chars")
    String countryCode,
    @Size(max = 500, message = "biography must have at most 500 chars")
    String biography,
    @Size(max = 2000000, message = "avatarData is too large")
    String avatarData
) {
}
