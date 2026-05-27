package com.impaintor.feature.realtime.security;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import com.impaintor.feature.realtime.config.RealtimeProperties;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Implementación de {@link TokenValidator} basada en jjwt.
 * Espera tokens HS256/HS384/HS512 firmados con el secret de
 * {@code impaintor.realtime.jwt.secret}, con {@code sub} = userId numérico
 * y claim {@code username}.
 */
@Component
public class JwtTokenValidator implements TokenValidator {

    private final SecretKey key;
    private final String expectedIssuer;

    public JwtTokenValidator(RealtimeProperties props) {
        this.key = Keys.hmacShaKeyFor(props.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.expectedIssuer = props.jwt().issuer();
    }

    @Override
    public Optional<AuthenticatedUser> validate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(expectedIssuer)
                    .build()
                    .parseSignedClaims(rawToken)
                    .getPayload();
            // sub = email (Spring Security username); uid claim = database user id
            String email = claims.getSubject();
            Long id = claims.get("uid", Long.class);
            if (email == null || id == null) {
                return Optional.empty();
            }
            return Optional.of(new AuthenticatedUser(id, email));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
