package com.impaintor.feature.game.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import com.impaintor.feature.game.model.GameState;
import com.impaintor.feature.game.model.GamePlayerRecord;
import com.impaintor.feature.game.model.GameRecord;
import com.impaintor.feature.game.repository.GamePlayerRecordRepository;
import com.impaintor.feature.game.repository.GameRecordRepository;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.repository.RoomRepository;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.user.repository.UserRepository;

@Service
public class GameEndService {

    private final GameRecordRepository gameRecordRepository;
    private final GamePlayerRecordRepository gamePlayerRecordRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    public GameEndService(GameRecordRepository gameRecordRepository, 
                          GamePlayerRecordRepository gamePlayerRecordRepository,
                          RoomRepository roomRepository,
                          UserRepository userRepository) {
        this.gameRecordRepository = gameRecordRepository;
        this.gamePlayerRecordRepository = gamePlayerRecordRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
    }

    /**
     * Persists the game result, updates ELO for ranked games, and resets the room.
     * Returns a map of userId → eloChange (0 for non-ranked games).
     */
    @Transactional
    public Map<Long, Integer> handleGameEnd(String roomCode, GameState gameState,
                                            Room.WinningSide winningSide, Room.EndCondition endCondition) {

        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new IllegalStateException("Room not found: " + roomCode));

        Map<Long, Integer> eloChanges = new HashMap<>();

        // 1. Crear GameRecord
        GameRecord gameRecord = GameRecord.builder()
                .roomCode(roomCode)
                .mode(room.getMode())
                .secretWord(gameState.getSecretWord())
                .rounds(gameState.getRound())
                .winningSide(winningSide)
                .endCondition(endCondition)
                .playedAt(LocalDateTime.now())
                .build();

        gameRecord = gameRecordRepository.save(gameRecord);

        // 2. Calcular Elos (Solo para RANKED)
        double paintorsEloSum = 0;
        int paintorsCount = 0;
        double impostorElo = 1000;

        List<User> players = room.getPlayersNames().stream()
                .map(player -> userRepository.findById(player.getId()).orElse(player))
                .collect(Collectors.toList());

        for (User user : players) {
            boolean isImpostor = gameState.getImpostorId() != null && gameState.getImpostorId().equals(user.getId());
            if (isImpostor) {
                impostorElo = user.getElo() != null ? user.getElo() : 1000;
            } else {
                paintorsEloSum += user.getElo() != null ? user.getElo() : 1000;
                paintorsCount++;
            }
        }
        double paintorsAvgElo = paintorsCount > 0 ? paintorsEloSum / paintorsCount : 1000;

        for (User user : players) {
            boolean isImpostor = gameState.getImpostorId() != null && gameState.getImpostorId().equals(user.getId());
            boolean isWinner = false;
            
            if (winningSide == Room.WinningSide.IMPAINTOR && isImpostor) {
                isWinner = true;
            } else if (winningSide == Room.WinningSide.PAINTOR && !isImpostor) {
                isWinner = true;
            }

            int eloChange = 0;
            if (room.getMode() == Room.Mode.RANKED) {
                double eloP = isImpostor ? paintorsAvgElo : impostorElo;
                double eloA = user.getElo() != null ? user.getElo() : 1000;

                double e = 1.0 / (1.0 + Math.pow(10.0, (eloP - eloA) / 400.0));
                double k;

                if (isImpostor) {
                    if (isWinner) {
                        k = endCondition == Room.EndCondition.LAST_STANDING ? 50.0 : 30.0;
                    } else {
                        k = endCondition == Room.EndCondition.VOTED_OUT ? -25.0 : -35.0;
                    }
                } else {
                    if (isWinner) {
                        k = gameState.getRound() < 4 ? 30.0 : 20.0;
                    } else {
                        k = endCondition == Room.EndCondition.WORD_GUESSED ? -20.0 : -40.0;
                    }
                }

                int rawEloChange = (int) Math.round(k * (isWinner ? (1.0 - e) : e));
                int newElo = Math.max(1000, (int) eloA + rawEloChange);
                eloChange = newElo - (int) eloA;
                user.setElo(newElo);
            }

            eloChanges.put(user.getId(), eloChange);

            // Crear record de jugador
            GamePlayerRecord playerRecord = GamePlayerRecord.builder()
                    .gameRecord(gameRecord)
                    .user(user)
                    .isImpostor(isImpostor)
                    .isWinner(isWinner)
                    .eloChange(eloChange)
                    .build();
            gamePlayerRecordRepository.save(playerRecord);

            // Actualizar estadísticas
            user.setGamesPlayed((user.getGamesPlayed() == null ? 0 : user.getGamesPlayed()) + 1);
            if (isWinner) {
                user.setGamesWon((user.getGamesWon() == null ? 0 : user.getGamesWon()) + 1);
            }
            userRepository.save(user);
        }

        // 3. Limpiar estado de la sala
        room.setGameState(Room.GameState.WAITING);
        room.setSecretWord(null);
        room.setHintWord(null);
        room.setWinningSide(null);
        room.setEndCondition(null);
        room.setPlayedAt(null);
        room.setRounds(null);
        room.setImpostorTries(null);

        // Si no es CUSTOM, vaciamos la lista de jugadores para que la sala quede libre
        if (room.getMode() != Room.Mode.CUSTOM) {
            room.getPlayersNames().clear();
        }

        roomRepository.save(room);

        return eloChanges;
    }
}
