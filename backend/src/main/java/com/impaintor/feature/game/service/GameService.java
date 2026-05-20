package com.impaintor.feature.game.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.impaintor.feature.game.model.GameState;
import com.impaintor.feature.realtime.dto.outbound.GameEvent.CanvasSnapshot;
import com.impaintor.feature.realtime.dto.outbound.RoleAssignment;
import com.impaintor.feature.realtime.service.RealtimePublisher;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.repository.RoomRepository;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.wordgroup.models.WordGroup;
import com.impaintor.feature.wordgroup.repositories.WordGroupRepository;
import com.impaintor.feature.realtime.dto.outbound.GameEvent;

/**
 * Inicializa y conserva el estado en memoria de una partida por sala.
 */
@Service
public class GameService {

    private final RoomRepository roomRepository;
    private final WordGroupRepository wordGroupRepository;
    private final RealtimePublisher realtimePublisher;

    private final Map<String, GameState> activeGames = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    public GameService(RoomRepository roomRepository,
                       WordGroupRepository wordGroupRepository,
                       RealtimePublisher realtimePublisher) {
        this.roomRepository = roomRepository;
        this.wordGroupRepository = wordGroupRepository;
        this.realtimePublisher = realtimePublisher;
    }

    @Transactional
    public GameState initializeGame(String roomCode) {
        GameState existing = activeGames.get(roomCode);
        if (existing != null) {
            return existing;
        }

        Room room = roomRepository.findById(roomCode)
                .orElseThrow(() -> new IllegalArgumentException("No existe la sala " + roomCode));

        List<User> players = room.getPlayersNames();
        if (players == null || players.size() < 3) {
            throw new IllegalStateException("Se necesitan al menos 3 jugadores para iniciar la partida");
        }

        WordGroup wordGroup = resolveWordGroup(room);
        List<String> candidateWords = new ArrayList<>();
        candidateWords.add(wordGroup.getWord1());
        candidateWords.add(wordGroup.getWord2());
        candidateWords.add(wordGroup.getWord3());
        Collections.shuffle(candidateWords);

        String secretWord = candidateWords.get(0);
        String hintWord = candidateWords.get(1);

        List<User> shuffledPlayers = new ArrayList<>(players);
        Collections.shuffle(shuffledPlayers);
        User impostor = shuffledPlayers.get(0);

        List<Long> drawingOrder = new ArrayList<>();
        for (User player : shuffledPlayers) {
            drawingOrder.add(player.getId());
        }

        GameState gameState = new GameState(drawingOrder, extractPlayerIds(players));
        gameState.setPhase(GameState.Phase.DRAWING);
        gameState.setRound(1);
        gameState.setWordGroup(wordGroup);
        gameState.setSecretWord(secretWord);
        gameState.setHintWord(hintWord);
        gameState.setImpostorId(impostor.getId());
        gameState.setImpostorLives(resolveImpostorLives(room));

        activeGames.put(roomCode, gameState);

        // start the first turn cycle
        startNextTurn(roomCode);

        room.setWordGroup(wordGroup);
        room.setSecretWord(secretWord);
        room.setHintWord(hintWord);
        room.setGameState(Room.GameState.PLAYING);
        roomRepository.save(room);

        sendRoleAssignments(players, gameState);
        return gameState;
    }

    public Optional<GameState> findActiveGame(String roomCode) {
        return Optional.ofNullable(activeGames.get(roomCode));
    }

    public void clearGame(String roomCode) {
        activeGames.remove(roomCode);
    }

    private WordGroup resolveWordGroup(Room room) {
        WordGroup roomGroup = room.getWordGroup();
        if (roomGroup != null) {
            return roomGroup;
        }

        return wordGroupRepository.findRandom()
                .orElseThrow(() -> new IllegalStateException("No hay grupos de palabras disponibles"));
    }

    private int resolveImpostorLives(Room room) {
        return room.getImpostorTries() != null ? room.getImpostorTries() : 1;
    }

    private List<Long> extractPlayerIds(List<User> players) {
        List<Long> ids = new ArrayList<>();
        for (User player : players) {
            ids.add(player.getId());
        }
        return ids;
    }

    private void sendRoleAssignments(List<User> players, GameState gameState) {
        for (User player : players) {
            Long playerId = player.getId();
            if (playerId != null && playerId.equals(gameState.getImpostorId())) {
                realtimePublisher.sendRoleAssignment(playerId,
                        new RoleAssignment.Impostor(gameState.getHintWord(), gameState.getImpostorLives()));
            } else {
                realtimePublisher.sendRoleAssignment(playerId,
                        new RoleAssignment.Painter(gameState.getSecretWord()));
            }
        }
    }

    public void recordCanvasSnapshot(String roomCode, Long playerId, String dataUrl) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;
        gs.recordCanvasSnapshot(playerId, dataUrl);
    }

    // --- Turn management ---
    private void startNextTurn(String roomCode) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;

        synchronized (gs) {
            Long drawer = gs.getCurrentDrawer();
            if (drawer == null) {
                // no more drawers this round -> gallery phase
                enterGalleryPhase(roomCode);
                return;
            }

            int timeSeconds = roomRepository.findById(roomCode)
                    .map(Room::getDrawTime)
                    .filter(d -> d != null && d > 0)
                    .orElse(30);

            gs.setPhase(GameState.Phase.DRAWING);
            realtimePublisher.publishGameEvent(roomCode, new GameEvent.TurnStart(drawer, timeSeconds));

            // schedule end of turn
            ScheduledFuture<?> f = scheduler.schedule(() -> endTurn(roomCode, drawer), timeSeconds, TimeUnit.SECONDS);
            ScheduledFuture<?> prev = scheduledTasks.put(roomCode, f);
            if (prev != null) prev.cancel(false);
        }
    }

    private void endTurn(String roomCode, Long drawerId) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;

        synchronized (gs) {
            // cancel stored task reference
            ScheduledFuture<?> scheduled = scheduledTasks.remove(roomCode);
            if (scheduled != null) scheduled.cancel(false);

            realtimePublisher.publishGameEvent(roomCode, new GameEvent.TurnEnd(drawerId));

            // advance to next drawer that is alive
            gs.advanceDrawer();
            Long next = gs.getCurrentDrawer();
            while (next != null && !gs.isPlayerAlive(next)) {
                gs.advanceDrawer();
                next = gs.getCurrentDrawer();
            }

            if (next == null) {
                // everyone drew -> gallery
                enterGalleryPhase(roomCode);
                return;
            }

            // start next turn
            startNextTurn(roomCode);
        }
    }

    private void enterGalleryPhase(String roomCode) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;

        synchronized (gs) {
            ScheduledFuture<?> scheduled = scheduledTasks.remove(roomCode);
            if (scheduled != null) scheduled.cancel(false);

            gs.setPhase(GameState.Phase.GALLERY);

            List<CanvasSnapshot> snapshots = new ArrayList<>();
            for (Long playerId : gs.getDrawingOrder()) {
                String dataUrl = gs.getCanvasSnapshots().get(playerId);
                if (dataUrl != null) {
                    snapshots.add(new CanvasSnapshot(playerId, dataUrl));
                }
            }
            for (Map.Entry<Long, String> entry : gs.getCanvasSnapshots().entrySet()) {
                boolean alreadyAdded = snapshots.stream().anyMatch(snapshot -> snapshot.playerId().equals(entry.getKey()));
                if (!alreadyAdded) {
                    snapshots.add(new CanvasSnapshot(entry.getKey(), entry.getValue()));
                }
            }

            realtimePublisher.publishGameEvent(roomCode, new GameEvent.GalleryPhase(snapshots));

            scheduleVotePhase(roomCode, gs);
        }
    }

    private void scheduleVotePhase(String roomCode, GameState gs) {
        int gallerySeconds = roomRepository.findById(roomCode)
                .map(Room::getDrawTime)
                .filter(d -> d != null && d > 0)
                .orElse(30) / 2;

        if (gallerySeconds < 5) {
            gallerySeconds = 5;
        }

        ScheduledFuture<?> f = scheduler.schedule(() -> startVotePhase(roomCode), gallerySeconds, TimeUnit.SECONDS);
        ScheduledFuture<?> prev = scheduledTasks.put(roomCode, f);
        if (prev != null) prev.cancel(false);
    }

    private void startVotePhase(String roomCode) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;

        synchronized (gs) {
            gs.setPhase(GameState.Phase.VOTING);
            gs.clearCanvasSnapshots();
            realtimePublisher.publishGameEvent(roomCode, new GameEvent.VotePhase(30));
        }
    }
}
