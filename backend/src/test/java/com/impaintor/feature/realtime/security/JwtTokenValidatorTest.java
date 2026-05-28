package com.impaintor.feature.realtime.security;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.Test;

import com.impaintor.feature.realtime.config.RealtimeProperties;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtTokenValidatorTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-test-secret-test";
    private static final String ISSUER = "impaintor-test";

    private final JwtTokenValidator validator = new JwtTokenValidator(testProps(SECRET, ISSUER));

    @Test
    void validToken_returnsAuthenticatedUser() {
        String token = signedToken(42L, "alice", Instant.now().plusSeconds(60), SECRET, ISSUER);

        Optional<AuthenticatedUser> result = validator.validate(token);

        assertThat(result).contains(new AuthenticatedUser(42L, "alice"));
    }

    @Test
    void tokenSignedWithDifferentSecret_returnsEmpty() {
        String otherSecret = "other-secret-other-secret-other-secret-other-secret";
        String token = signedToken(42L, "alice", Instant.now().plusSeconds(60), otherSecret, ISSUER);

        assertThat(validator.validate(token)).isEmpty();
    }

    @Test
    void expiredToken_returnsEmpty() {
        String token = signedToken(42L, "alice", Instant.now().minusSeconds(60), SECRET, ISSUER);

        assertThat(validator.validate(token)).isEmpty();
    }

    @Test
    void tokenWithWrongIssuer_returnsEmpty() {
        String token = signedToken(42L, "alice", Instant.now().plusSeconds(60), SECRET, "someone-else");

        assertThat(validator.validate(token)).isEmpty();
    }

    @Test
    void malformedToken_returnsEmpty() {
        assertThat(validator.validate("not-a-jwt")).isEmpty();
        assertThat(validator.validate("aaa.bbb.ccc")).isEmpty();
    }

    @Test
    void nullOrBlankToken_returnsEmpty() {
        assertThat(validator.validate(null)).isEmpty();
        assertThat(validator.validate("")).isEmpty();
        assertThat(validator.validate("   ")).isEmpty();
    }

    private static String signedToken(Long id, String username, Instant exp, String secret, String issuer) {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(UTF_8));
        return Jwts.builder()
                .subject(String.valueOf(id))
                .claim("username", username)
                .issuer(issuer)
                .expiration(Date.from(exp))
                .signWith(key)
                .compact();
    }

    private static RealtimeProperties testProps(String secret, String issuer) {
        return new RealtimeProperties(
                new RealtimeProperties.Broker("simple", "localhost", 61613, "guest", "guest"),
                new RealtimeProperties.Jwt(secret, issuer),
                new RealtimeProperties.Websocket("/ws", List.of("*"))
        );
    }
}
