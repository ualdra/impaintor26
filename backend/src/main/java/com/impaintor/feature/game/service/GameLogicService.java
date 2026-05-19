package com.impaintor.feature.game.service;

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
        return null;
    }
}
