package com.impaintor.feature.user.service;

import com.impaintor.feature.user.dto.LeaderboardEntryResponse;
import com.impaintor.feature.user.dto.UpdateMeRequest;
import com.impaintor.feature.user.dto.UserMeResponse;
import com.impaintor.feature.user.dto.UserPublicResponse;
import com.impaintor.feature.user.mapper.UserMapper;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final Set<String> EUROPEAN_COUNTRY_CODES = Set.of(
        "AL", "AD", "AM", "AT", "AZ", "BY", "BE", "BA", "BG", "HR",
        "CY", "CZ", "DK", "EE", "FI", "FR", "GE", "DE", "GR", "HU",
        "IS", "IE", "IT", "KZ", "XK", "LV", "LI", "LT", "LU", "MT",
        "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU",
        "SM", "RS", "SK", "SI", "ES", "SE", "CH", "TR", "UA", "GB", "VA"
    );

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserMeResponse getMe(Long userId) {
        User user = findUserById(userId);
        return UserMapper.toMe(user);
    }

    public UserMeResponse updateMe(Long userId, UpdateMeRequest request) {
        User user = findUserById(userId);

        if (StringUtils.hasText(request.username())) {
            String newUsername = request.username().trim();
            if (!newUsername.equalsIgnoreCase(user.getUsername())
                && userRepository.existsByUsernameAndIdNot(newUsername, userId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already in use");
            }
            user.setUsername(newUsername);
        }

        if (StringUtils.hasText(request.password())) {
            user.setPassword(passwordEncoder.encode(request.password()));
        }

        if (request.countryCode() != null) {
            String normalizedCountry = request.countryCode().trim().toUpperCase(Locale.ROOT);
            if (normalizedCountry.isBlank()) {
                user.setCountryCode(null);
            } else {
                if (!EUROPEAN_COUNTRY_CODES.contains(normalizedCountry)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Country must belong to Europe");
                }
                user.setCountryCode(normalizedCountry);
            }
        }

        if (request.biography() != null) {
            String normalizedBiography = request.biography().trim();
            user.setBiography(normalizedBiography.isBlank() ? null : normalizedBiography);
        }

        if (request.avatarData() != null) {
            String normalizedAvatar = request.avatarData().trim();
            user.setAvatarData(normalizedAvatar.isBlank() ? null : normalizedAvatar);
        }

        User updatedUser = userRepository.save(user);
        return UserMapper.toMe(updatedUser);
    }

    public void deleteMe(Long userId) {
        User user = findUserById(userId);
        userRepository.delete(user);
    }

    public UserPublicResponse getPublicProfile(Long id) {
        User user = findUserById(id);
        return UserMapper.toPublic(user);
    }

    public Page<LeaderboardEntryResponse> getLeaderboard(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(1, Math.min(size, 100));
        PageRequest pageable = PageRequest.of(safePage, safeSize);

        return userRepository.findAllByOrderByEloDescUsernameAsc(pageable)
            .map(UserMapper::toLeaderboardEntry);
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
