package com.impaintor.feature.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank(message = "email is required")
    @Email(message = "email must be valid")
    String email,
    @NotBlank(message = "username is required")
    @Size(min = 3, max = 30, message = "username must be between 3 and 30 chars")
    String username,
    @NotBlank(message = "password is required")
    @Size(min = 6, max = 100, message = "password must be between 6 and 100 chars")
    String password
) {
}
