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
    private final String issuer;

    public JwtTokenValidator(RealtimeProperties props) {
        this.key = Keys.hmacShaKeyFor(props.jwt().secret().getBytes(StandardCharsets.UTF_8));
        this.issuer = props.jwt().issuer();
    }

    @Override
    public Optional<AuthenticatedUser> validate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .requireIssuer(issuer)
                    .build()
                    .parseSignedClaims(rawToken)
                    .getPayload();
            Long id = Long.valueOf(claims.getSubject());
            String username = claims.get("username", String.class);
            if (username == null) {
                return Optional.empty();
            }
            return Optional.of(new AuthenticatedUser(id, username));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
