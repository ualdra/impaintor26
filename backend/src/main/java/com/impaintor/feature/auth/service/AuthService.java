package com.impaintor.feature.auth.service;

import com.impaintor.feature.auth.config.AppUserDetails;
import com.impaintor.feature.auth.config.JwtService;
import com.impaintor.feature.auth.dto.AuthResponse;
import com.impaintor.feature.auth.dto.LoginRequest;
import com.impaintor.feature.auth.dto.RegisterRequest;
import com.impaintor.feature.user.dto.UserPublicResponse;
import com.impaintor.feature.user.mapper.UserMapper;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserPublicResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already in use");
        }

        User user = User.builder()
            .email(request.email().trim().toLowerCase())
            .username(request.username().trim())
            .password(passwordEncoder.encode(request.password()))
            .build();

        User savedUser = userRepository.save(user);
        return UserMapper.toPublic(savedUser);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        AppUserDetails userDetails = AppUserDetails.fromUser(user);
        String token = jwtService.generateToken(userDetails);

        return new AuthResponse(token, UserMapper.toMe(user));
    }
}
