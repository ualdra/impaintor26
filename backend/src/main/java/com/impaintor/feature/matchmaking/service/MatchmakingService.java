package com.impaintor.feature.matchmaking.service;

import com.impaintor.feature.matchmaking.dto.MatchmakingStatusResponse;
import com.impaintor.feature.matchmaking.models.QueueEntry;
import com.impaintor.feature.realtime.dto.outbound.MatchFoundNotification;
import com.impaintor.feature.realtime.service.RealtimePublisher;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.repository.RoomRepository;
import com.impaintor.feature.room.utilities.RandomGenerations;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.user.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchmakingService {

    private static final int BASE_RANGE = 50;
    private static final int RANGE_EXPANSION_STEP = 100;
    private static final int EXPANSION_INTERVAL_SECONDS = 10;
    private static final int MATCH_SIZE = 5;

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final RealtimePublisher realtimePublisher;

    // Inline-initialized so @RequiredArgsConstructor does not include it as a constructor arg.
    private final ConcurrentHashMap<Long, QueueEntry> queue = new ConcurrentHashMap<>();
    // Holds the room code for users who were matched but may not have received the WS notification.
    private final ConcurrentHashMap<Long, String> pendingMatches = new ConcurrentHashMap<>();

    // --- Public queue API (called by MatchmakingController) ---

    /** Idempotent: re-joining preserves the original entry (keeps wait time and ELO snapshot). */
    public MatchmakingStatusResponse join(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        queue.putIfAbsent(userId, new QueueEntry(userId, user.getElo() != null ? user.getElo() : 1000, Instant.now()));
        return getStatus(userId);
    }

    /** Voluntary cancel — removes from queue AND pending match (player chose to stop). */
    public void leave(Long userId) {
        queue.remove(userId);
        pendingMatches.remove(userId);
    }

    /**
     * Called on WebSocket disconnect. Removes the player from the active queue but
     * preserves any pending match info so the polling fallback can still deliver the
     * room code when they reconnect.
     */
    public void onDisconnect(Long userId) {
        queue.remove(userId);
    }

    public MatchmakingStatusResponse getStatus(Long userId) {
        QueueEntry entry = queue.get(userId);
        if (entry == null) {
            String roomCode = pendingMatches.remove(userId);
            return new MatchmakingStatusResponse(false, 0, 0, roomCode);
        }
        long waitSeconds = ChronoUnit.SECONDS.between(entry.joinedAt(), Instant.now());
        return new MatchmakingStatusResponse(true, waitSeconds, searchRangeFor(entry), null);
    }

    // --- Matching loop (called by MatchmakingScheduler every 2 s) ---

    public void tryFormMatches() {
        boolean matchFormed;
        do {
            matchFormed = tryFormOneMatch();
        } while (matchFormed);
    }

    private boolean tryFormOneMatch() {
        List<QueueEntry> sorted = new ArrayList<>(queue.values());
        if (sorted.size() < MATCH_SIZE) return false;

        sorted.sort(Comparator.comparingInt(QueueEntry::elo));

        for (int i = 0; i <= sorted.size() - MATCH_SIZE; i++) {
            List<QueueEntry> window = new ArrayList<>(sorted.subList(i, i + MATCH_SIZE));

            int spread = window.get(MATCH_SIZE - 1).elo() - window.get(0).elo();
            int tightestRange = window.stream()
                    .mapToInt(this::searchRangeFor)
                    .min()
                    .orElse(0);

            if (spread <= tightestRange) {
                window.forEach(e -> queue.remove(e.userId()));
                try {
                    createRankedRoom(window);
                    return true;
                } catch (Exception ex) {
                    log.error("Failed to create ranked room for {} players, re-queuing", window.size(), ex);
                    // Restore entries with original joinedAt so players keep their wait time.
                    window.forEach(e -> queue.putIfAbsent(e.userId(), e));
                    return false;
                }
            }
        }
        return false;
    }

    private void createRankedRoom(List<QueueEntry> group) {
        List<User> users = group.stream()
                .map(e -> userRepository.findById(e.userId())
                        .orElseThrow(() -> new IllegalStateException("User " + e.userId() + " vanished before room creation")))
                .toList();

        String code = RandomGenerations.CodifyRoomId(RandomGenerations.RoomRandomId());
        Room room = new Room();
        room.setRoomCode(code);
        room.setMode(Room.Mode.RANKED);
        room.setSize(MATCH_SIZE);
        room.setGameState(Room.GameState.WAITING);
        room.setPlayersNames(new ArrayList<>(users));
        roomRepository.save(room);

        users.forEach(u -> pendingMatches.put(u.getId(), code));

        MatchFoundNotification notification = new MatchFoundNotification(code);
        users.forEach(u -> {
            try {
                realtimePublisher.sendMatchFound(u.getId(), notification);
            } catch (Exception ex) {
                log.warn("WS notification failed for user {} (polling fallback active): {}", u.getId(), ex.getMessage());
            }
        });

        log.info("Ranked room {} created for players {}", code,
                users.stream().map(User::getId).toList());
    }

    // Package-visible for MatchmakingScheduler tests and future 3J.5 integrations.
    // Range starts at ±50 and expands by ±100 every 10 seconds.
    int searchRangeFor(QueueEntry entry) {
        long waited = ChronoUnit.SECONDS.between(entry.joinedAt(), Instant.now());
        return BASE_RANGE + (int) (waited / EXPANSION_INTERVAL_SECONDS) * RANGE_EXPANSION_STEP;
    }
}
