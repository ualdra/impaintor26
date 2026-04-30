package com.impaintor.feature.realtime.dto.outbound;

import com.fasterxml.jackson.annotation.JsonProperty;

/** Resultado privado de un intento de adivinación del impostor. */
public record GuessResult(
        @JsonProperty("type") String type,
        @JsonProperty("correct") boolean correct,
        @JsonProperty("livesRemaining") int livesRemaining
) {
    public GuessResult(boolean correct, int livesRemaining) {
        this("GUESS_RESULT", correct, livesRemaining);
    }
}
