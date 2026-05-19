package com.impaintor.feature.game.models;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VoteResult {
    private boolean isTie;
    private List<Long> tiedPlayersId;
    private Long eliminatedPlayerId;
    private boolean nobodyEliminated;
    private boolean isGameOver;
    private String winner;
}
