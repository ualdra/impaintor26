package com.impaintor.feature.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateMeRequest(
    @Size(min = 3, max = 30, message = "username must be between 3 and 30 chars")
    String username,
    @Size(min = 6, max = 100, message = "password must be between 6 and 100 chars")
    String password
) {
}
