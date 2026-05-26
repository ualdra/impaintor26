package com.impaintor.feature.game.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.impaintor.feature.game.model.GalleryPhaseEvent;
import com.impaintor.feature.game.model.GameState;
import com.impaintor.feature.game.model.GameState.CanvasSnapshot;
import com.impaintor.feature.realtime.dto.outbound.GameEvent;
import com.impaintor.feature.realtime.dto.outbound.GuessResult;
import com.impaintor.feature.realtime.dto.outbound.RoleAssignment;
import com.impaintor.feature.realtime.service.GameInputHandler;
import com.impaintor.feature.realtime.service.RealtimePublisher;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.repository.RoomRepository;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.wordgroup.models.WordGroup;
import com.impaintor.feature.wordgroup.repositories.WordGroupRepository;

/**
 * Inicializa y conserva el estado en memoria de una partida por sala.
 */
@Service
public class GameService implements GameInputHandler {

    private static final String GAME_TOPIC = "/topic/room.%s.game";

    private final RoomRepository roomRepository;
    private final WordGroupRepository wordGroupRepository;
    private final RealtimePublisher realtimePublisher;
    private final SimpMessagingTemplate messagingTemplate;
    private final GameEndService gameEndService;
    private final GameLogicService gameLogicService;

    private final Map<String, GameState> activeGames = new ConcurrentHashMap<>();
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(4);

    public GameService(RoomRepository roomRepository,
                       WordGroupRepository wordGroupRepository,
                       RealtimePublisher realtimePublisher,
                       SimpMessagingTemplate messagingTemplate,
                       GameEndService gameEndService,
                       GameLogicService gameLogicService) {
        this.roomRepository = roomRepository;
        this.wordGroupRepository = wordGroupRepository;
        this.realtimePublisher = realtimePublisher;
        this.messagingTemplate = messagingTemplate;
        this.gameEndService = gameEndService;
        this.gameLogicService = gameLogicService;
    }

    @Transactional
    public GameState initializeGame(String roomCode) {
        GameState existing = activeGames.get(roomCode);
        if (existing != null) {
            return existing;
        }

        Room room = roomRepository.findByRoomCode(roomCode)
                .orElseThrow(() -> new IllegalArgumentException("No existe la sala " + roomCode));

        List<User> players = room.getPlayersNames();
        if (players == null || players.size() < 3) {
            throw new IllegalStateException("Se necesitan al menos 3 jugadores para iniciar la partida");
        }

        WordGroup wordGroup = resolveWordGroup(room);
        // word1 is always the drawable word shown to painters; hint is randomly chosen from word2 or word3
        String secretWord = wordGroup.getWord1();
        String hintWord = Math.random() < 0.5 ? wordGroup.getWord2() : wordGroup.getWord3();

        List<User> shuffledPlayers = new ArrayList<>(players);
        Collections.shuffle(shuffledPlayers);
        User impostor = shuffledPlayers.get(0);

        List<Long> drawingOrder = new ArrayList<>();
        for (User player : shuffledPlayers) {
            drawingOrder.add(player.getId());
        }

        int impostorLives = (room.getImpostorTries() != null && room.getImpostorTries() > 0)
                ? room.getImpostorTries() : 1;

        GameState gameState = new GameState(drawingOrder, extractPlayerIds(players));
        gameState.setPhase(GameState.Phase.DRAWING);
        gameState.setRound(1);
        gameState.setWordGroup(wordGroup);
        gameState.setSecretWord(secretWord);
        gameState.setHintWord(hintWord);
        gameState.setImpostorId(impostor.getId());
        gameState.setImpostorLives(impostorLives);

        activeGames.put(roomCode, gameState);

        realtimePublisher.publishGameEvent(roomCode, new GameEvent.GameStart(drawingOrder, 1));

        room.setWordGroup(wordGroup);
        room.setSecretWord(secretWord);
        room.setHintWord(hintWord);
        room.setGameState(Room.GameState.PLAYING);
        roomRepository.save(room);

        // Delay role assignments and first turn so all clients have time to navigate
        // from the lobby to /game and re-subscribe before TURN_START arrives.
        // Without this delay, the lobby's still-active subscription consumes TURN_START
        // and GameComponent never sees it, causing the first drawer to be skipped.
        final List<User> playerSnapshot = List.copyOf(players);
        ScheduledFuture<?> f = scheduler.schedule(() -> {
            sendRoleAssignments(playerSnapshot, gameState);
            startNextTurn(roomCode);
        }, 3, TimeUnit.SECONDS);
        ScheduledFuture<?> prev = scheduledTasks.put(roomCode, f);
        if (prev != null) prev.cancel(false);

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

            int timeSeconds = roomRepository.findByRoomCode(roomCode)
                    .map(Room::getDrawTime)
                    .filter(d -> d != null && d > 0)
                    .orElse(30);

            gs.setPhase(GameState.Phase.DRAWING);
            realtimePublisher.publishGameEvent(roomCode, new GameEvent.TurnStart(drawer, timeSeconds, gs.getDrawingOrder()));

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

            messagingTemplate.convertAndSend(GAME_TOPIC.formatted(roomCode), new GalleryPhaseEvent(snapshots));

            scheduleVotePhase(roomCode, gs);
        }
    }

    private void scheduleVotePhase(String roomCode, GameState gs) {
        int gallerySeconds = roomRepository.findByRoomCode(roomCode)
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

    private static final int VOTE_SECONDS = 30;
    private static final int TIE_BREAK_SECONDS = 15;

    private void startVotePhase(String roomCode) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;

        synchronized (gs) {
            gs.setPhase(GameState.Phase.VOTING);
            gs.clearCanvasSnapshots();
            gs.clearVotes();
            realtimePublisher.publishGameEvent(roomCode, new GameEvent.VotePhase(VOTE_SECONDS));

            ScheduledFuture<?> f = scheduler.schedule(() -> resolveVoting(roomCode), VOTE_SECONDS, TimeUnit.SECONDS);
            ScheduledFuture<?> prev = scheduledTasks.put(roomCode, f);
            if (prev != null) prev.cancel(false);
        }
    }

    private void resolveVoting(String roomCode) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;

        synchronized (gs) {
            if (gs.getPhase() != GameState.Phase.VOTING) return;

            ScheduledFuture<?> scheduled = scheduledTasks.remove(roomCode);
            if (scheduled != null) scheduled.cancel(false);

            // Auto-vote: players who didn't vote count as voting for themselves (§2.3)
            for (Long playerId : gs.getAlivePlayers()) {
                if (!gs.getVotes().containsKey(playerId)) {
                    gs.recordVote(playerId, playerId);
                }
            }

            applyVoteResolution(roomCode, gs);
        }
    }

    /**
     * Tallies the current votes in gs and either:
     * - Round 1 tie → nobody eliminated, next round.
     * - Round 2+ tie (not already in TIE_BREAK) → VOTE_TIE, impostor gets TIE_BREAK_SECONDS.
     * - Clear winner → eliminate, check win conditions.
     * Called from resolveVoting (end of timer) and onVoteMove (after impostor moves their vote).
     * Must be called within synchronized(gs).
     */
    private void applyVoteResolution(String roomCode, GameState gs) {
        Map<Long, Long> tally = new HashMap<>();
        for (Long votedId : gs.getVotes().values()) {
            tally.merge(votedId, 1L, Long::sum);
        }

        Long eliminated = null;
        long maxVotes = 0;
        boolean tie = false;
        for (Map.Entry<Long, Long> entry : tally.entrySet()) {
            if (entry.getValue() > maxVotes) {
                maxVotes = entry.getValue();
                eliminated = entry.getKey();
                tie = false;
            } else if (entry.getValue() == maxVotes) {
                tie = true;
            }
        }
        if (tie) eliminated = null;

        long finalMaxVotes = maxVotes;
        List<GameEvent.TopVote> topVoted = tally.entrySet().stream()
                .filter(e -> e.getValue() == finalMaxVotes)
                .map(e -> new GameEvent.TopVote(e.getKey(), (int) (long) e.getValue()))
                .toList();

        // Round 2+ tie → enter tie-break phase (but only once — not if already in TIE_BREAK)
        if (tie && gs.getRound() >= 2 && gs.getPhase() != GameState.Phase.TIE_BREAK) {
            gs.setPhase(GameState.Phase.TIE_BREAK);
            realtimePublisher.publishGameEvent(roomCode,
                    new GameEvent.VoteTie(topVoted, TIE_BREAK_SECONDS));
            ScheduledFuture<?> f = scheduler.schedule(
                    () -> autoExpelImpostor(roomCode), TIE_BREAK_SECONDS, TimeUnit.SECONDS);
            ScheduledFuture<?> prev = scheduledTasks.put(roomCode, f);
            if (prev != null) prev.cancel(false);
            return; // votes NOT cleared — impostor still has theirs to move
        }

        // Normal resolution (round 1 tie → eliminated stays null, no tie-break)
        boolean wasImpostor = eliminated != null && eliminated.equals(gs.getImpostorId());
        if (eliminated != null) gs.eliminatePlayer(eliminated);
        gs.clearVotes();

        realtimePublisher.publishGameEvent(roomCode,
                new GameEvent.VoteResult(eliminated, wasImpostor, topVoted));

        if (wasImpostor) {
            finishGame(roomCode, gs, Room.WinningSide.PAINTOR, Room.EndCondition.VOTED_OUT,
                    "PAINTERS", "VOTED_OUT");
            return;
        }

        if (gs.getAlivePlayers().size() <= 2 && gs.getAlivePlayers().contains(gs.getImpostorId())) {
            finishGame(roomCode, gs, Room.WinningSide.IMPAINTOR, Room.EndCondition.LAST_STANDING,
                    "IMPOSTOR", "LAST_STANDING");
            return;
        }

        int newRound = gs.getRound() + 1;
        gs.setRound(newRound);
        List<Long> aliveOrder = new ArrayList<>(gs.getDrawingOrder());
        aliveOrder.removeIf(id -> !gs.isPlayerAlive(id));
        gs.setDrawingOrder(aliveOrder);

        scheduler.schedule(() -> startNewRound(roomCode, newRound), 4, TimeUnit.SECONDS);
    }

    /** Timer fires: impostor didn't move their vote → auto-expel impostor (§2.3). */
    private void autoExpelImpostor(String roomCode) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;
        synchronized (gs) {
            if (gs.getPhase() != GameState.Phase.TIE_BREAK) return;
            com.impaintor.feature.game.model.VoteResult result = gameLogicService.handleTieBreak(gs, null);
            gs.clearVotes();
            realtimePublisher.publishGameEvent(roomCode,
                    new GameEvent.VoteResult(result.getEliminatedPlayerId(), true, List.of()));
            finishGame(roomCode, gs, Room.WinningSide.PAINTOR, Room.EndCondition.TIE_NOT_BROKEN,
                    "PAINTERS", "TIE_NOT_BROKEN");
        }
    }

    private void finishGame(String roomCode, GameState gs,
                            Room.WinningSide side, Room.EndCondition condition,
                            String winner, String reason) {
        Long impostorId = gs.getImpostorId();
        String secretWord = gs.getSecretWord();
        Map<Long, Integer> eloChanges = gameEndService.handleGameEnd(roomCode, gs, side, condition);
        realtimePublisher.publishGameEvent(roomCode,
                new GameEvent.GameOver(winner, reason, impostorId, secretWord));
        sendEloUpdates(eloChanges);
        activeGames.remove(roomCode);
    }

    // ── GameInputHandler impl ────────────────────────────────────────────────

    @Override
    public void onVote(String roomCode, Long voterId, Long votedPlayerId) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;
        synchronized (gs) {
            if (gs.getPhase() != GameState.Phase.VOTING) return;
            gs.recordVote(voterId, votedPlayerId);
        }
    }

    @Override
    public void onVoteMove(String roomCode, Long impostorId, Long targetPlayerId) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;
        synchronized (gs) {
            if (gs.getPhase() != GameState.Phase.TIE_BREAK) return;
            if (!impostorId.equals(gs.getImpostorId())) return;

            ScheduledFuture<?> scheduled = scheduledTasks.remove(roomCode);
            if (scheduled != null) scheduled.cancel(false);

            gs.recordVote(impostorId, targetPlayerId);
            applyVoteResolution(roomCode, gs);
        }
    }

    @Override
    public void onGuess(String roomCode, Long impostorId, String guess) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;
        synchronized (gs) {
            if (!impostorId.equals(gs.getImpostorId())) return;

            boolean correct = gameLogicService.handleImpostorGuess(gs, guess).isCorrect();

            if (correct) {
                realtimePublisher.sendGuessResult(impostorId,
                        new GuessResult(true, gs.getImpostorLives()));
                realtimePublisher.publishGameEvent(roomCode,
                        new GameEvent.GuessAttempt(gs.getImpostorLives(), true));
                finishGame(roomCode, gs, Room.WinningSide.IMPAINTOR, Room.EndCondition.WORD_GUESSED,
                        "IMPOSTOR", "WORD_GUESSED");
            } else {
                int livesLeft = gs.getImpostorLives() - 1;
                gs.setImpostorLives(livesLeft);
                realtimePublisher.sendGuessResult(impostorId, new GuessResult(false, livesLeft));
                realtimePublisher.publishGameEvent(roomCode,
                        new GameEvent.GuessAttempt(livesLeft, false));
                if (livesLeft <= 0) {
                    finishGame(roomCode, gs, Room.WinningSide.PAINTOR, Room.EndCondition.OUT_OF_LIVES,
                            "PAINTERS", "OUT_OF_LIVES");
                }
            }
        }
    }

    private void sendEloUpdates(Map<Long, Integer> eloChanges) {
        for (Map.Entry<Long, Integer> entry : eloChanges.entrySet()) {
            realtimePublisher.sendEloUpdate(entry.getKey(), entry.getValue());
        }
    }

    private void startNewRound(String roomCode, int round) {
        GameState gs = activeGames.get(roomCode);
        if (gs == null) return;

        synchronized (gs) {
            realtimePublisher.publishGameEvent(roomCode,
                    new GameEvent.NewRound(round, gs.getDrawingOrder()));
            startNextTurn(roomCode);
        }
    }
}
