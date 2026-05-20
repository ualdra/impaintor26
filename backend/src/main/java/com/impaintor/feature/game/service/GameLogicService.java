package com.impaintor.feature.game.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.impaintor.feature.game.models.GameState;
import com.impaintor.feature.game.models.GuessResult;
import com.impaintor.feature.game.models.VoteResult;

@Service
public class GameLogicService {

    public GuessResult handleImpostorGuess(GameState state, String guess) {
        String normalizedGuess = guess.toLowerCase().trim();
        String normalizedWord = state.getSecretWord().toLowerCase().trim();

        if (normalizedGuess.equals(normalizedWord)) {
            return GuessResult.builder().isCorrect(true).isGameOver(true).winner("IMPAINTOR").build();
        } else {
            return GuessResult.builder().isCorrect(false).isGameOver(true).winner("PAINTORS").build();
        }
    }

    public VoteResult handleVotes(GameState state, Map<Long, Long> incomingVotes) {
        // 1. Rellenar las ausencias (quien no vota, se vota a sí mismo)
        Map<Long, Long> finalVotes = new HashMap<>(incomingVotes);
        if (state.getAlivePlayerId() != null) {
            for (Long playerId : state.getAlivePlayerId()) {
                finalVotes.putIfAbsent(playerId, playerId);
            }
        }

        // 2. Contar los votos
        Map<Long, Integer> voteCounts = new HashMap<>();
        for (Long votedId : finalVotes.values()) {
            voteCounts.put(votedId, voteCounts.getOrDefault(votedId, 0) + 1);
        }

        // 3. Encontrar el número máximo de votos
        int maxVotes = 0;
        for (int count : voteCounts.values()) {
            if (count > maxVotes) {
                maxVotes = count;
            }
        }

        // 4. Ver qué jugadores tienen ese máximo de votos
        List<Long> topVotedPlayers = new ArrayList<>();
        for (Map.Entry<Long, Integer> entry : voteCounts.entrySet()) {
            if (entry.getValue() == maxVotes) {
                topVotedPlayers.add(entry.getKey());
            }
        }

        boolean isTie = topVotedPlayers.size() > 1;

        if (state.getCurrentRound() == 1) {
            if (isTie) {
                return VoteResult.builder()
                        .nobodyEliminated(true)
                        .isTie(false)
                        .eliminatedPlayerId(null)
                        .isGameOver(false)
                        .build();
            } else {
                Long eliminatedId = topVotedPlayers.get(0);
                boolean isImpostor = eliminatedId.equals(state.getImpostorId());
                return VoteResult.builder()
                        .nobodyEliminated(false)
                        .isTie(false)
                        .eliminatedPlayerId(eliminatedId)
                        .isGameOver(isImpostor)
                        .winner(isImpostor ? "PAINTORS" : null)
                        .build();
            }
        } else {
            if (isTie) {
                return VoteResult.builder()
                        .nobodyEliminated(false)
                        .isTie(true)
                        .tiedPlayersId(topVotedPlayers)
                        .eliminatedPlayerId(null)
                        .isGameOver(false)
                        .build();
            } else {
                Long eliminatedId = topVotedPlayers.get(0);
                boolean isImpostor = eliminatedId.equals(state.getImpostorId());
                return VoteResult.builder()
                        .nobodyEliminated(false)
                        .isTie(false)
                        .eliminatedPlayerId(eliminatedId)
                        .isGameOver(isImpostor)
                        .winner(isImpostor ? "PAINTORS" : null)
                        .build();
            }
        }
    }

    public VoteResult handleTieBreak(GameState state, Long impostorTargetId) {
        if (impostorTargetId == null) {
            return VoteResult.builder()
                    .nobodyEliminated(false)
                    .isTie(false)
                    .eliminatedPlayerId(state.getImpostorId())
                    .isGameOver(true)
                    .winner("PAINTORS")
                    .build();
        }

        boolean isImpostorEliminated = impostorTargetId.equals(state.getImpostorId());

        return VoteResult.builder()
                .nobodyEliminated(false)
                .isTie(false)
                .eliminatedPlayerId(impostorTargetId)
                .isGameOver(isImpostorEliminated)
                .winner(isImpostorEliminated ? "PAINTORS" : null)
                .build();
    }

    public VoteResult applyRoundResult(GameState state, VoteResult result) {

        if (result.isGameOver()) {
            return result;
        }

        if (result.getEliminatedPlayerId() != null && state.getAlivePlayerId() != null) {
            state.getAlivePlayerId().remove(result.getEliminatedPlayerId());
        }

        if (state.getAlivePlayerId() != null && state.getAlivePlayerId().size() <= 2) {
            if (state.getAlivePlayerId().contains(state.getImpostorId())) {
                return VoteResult.builder()
                        .nobodyEliminated(result.isNobodyEliminated())
                        .isTie(result.isTie())
                        .tiedPlayersId(result.getTiedPlayersId())
                        .eliminatedPlayerId(result.getEliminatedPlayerId())
                        .isGameOver(true)
                        .winner("IMPAINTOR")
                        .build();
            }
        }

        if (!result.isTie()) {
            state.setCurrentRound(state.getCurrentRound() + 1);
        }

        return result;
    }
}