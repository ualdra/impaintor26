package com.impaintor.feature.realtime.dto.outbound;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Asignación de rol enviada una sola vez al inicio de partida vía
 * {@code /user/queue/private}. La forma JSON respeta la sección 6.2 de CLAUDE.md:
 * {@code type:"ROLE_ASSIGNMENT", role:"PAINTER"|"IMPOSTOR", ...}.
 */
public sealed interface RoleAssignment {

    String type();

    String role();

    record Painter(
            @JsonProperty("type") String type,
            @JsonProperty("role") String role,
            @JsonProperty("word") String word
    ) implements RoleAssignment {
        public Painter(String word) {
            this("ROLE_ASSIGNMENT", "PAINTER", word);
        }
    }

    record Impostor(
            @JsonProperty("type") String type,
            @JsonProperty("role") String role,
            @JsonProperty("hint") String hint,
            @JsonProperty("lives") int lives
    ) implements RoleAssignment {
        public Impostor(String hint, int lives) {
            this("ROLE_ASSIGNMENT", "IMPOSTOR", hint, lives);
        }
    }
}
