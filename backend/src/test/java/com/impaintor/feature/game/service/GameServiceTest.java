package com.impaintor.feature.game.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import com.impaintor.feature.game.model.GameState;
import com.impaintor.feature.game.model.GalleryPhaseEvent;
import com.impaintor.feature.realtime.dto.outbound.RoleAssignment;
import com.impaintor.feature.realtime.service.RealtimePublisher;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.repository.RoomRepository;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.wordgroup.models.WordGroup;
import com.impaintor.feature.wordgroup.repositories.WordGroupRepository;

class GameServiceTest {

    private static final String ROOM_CODE = "ABC123";

    private RoomRepository roomRepository;
    private WordGroupRepository wordGroupRepository;
    private RealtimePublisher realtimePublisher;
    private SimpMessagingTemplate messagingTemplate;
    private GameEndService gameEndService;
    private GameLogicService gameLogicService;
    private ScheduledExecutorService scheduler;
    private ScheduledFuture<?> scheduledFuture;
    private GameService service;

    @BeforeEach
    void setUp() {
        roomRepository = mock(RoomRepository.class);
        wordGroupRepository = mock(WordGroupRepository.class);
        realtimePublisher = mock(RealtimePublisher.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        gameEndService = mock(GameEndService.class);
        gameLogicService = mock(GameLogicService.class);
        scheduler = mock(ScheduledExecutorService.class);
        scheduledFuture = mock(ScheduledFuture.class);

        service = new GameService(roomRepository, wordGroupRepository, realtimePublisher, messagingTemplate, gameEndService, gameLogicService);
        ReflectionTestUtils.setField(service, "scheduler", scheduler);
    }

    @Test
    void initializeGame_selectsWordGroup_assignsRoles_andSchedulesFirstTurn() {
        Room room = roomWithPlayersAndTiming(30, 0);
        WordGroup wordGroup = new WordGroup("guitarra", "piano", "violonchelo", "manual", "es");

        when(roomRepository.findByRoomCode(ROOM_CODE)).thenReturn(Optional.of(room));
        when(wordGroupRepository.findRandom()).thenReturn(Optional.of(wordGroup));
        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doReturn(scheduledFuture).when(scheduler).schedule(any(Runnable.class), anyLong(), eq(TimeUnit.SECONDS));

        GameState gameState = service.initializeGame(ROOM_CODE);

        assertThat(service.findActiveGame(ROOM_CODE)).containsSame(gameState);
        assertThat(gameState.getRound()).isEqualTo(1);
        assertThat(gameState.getPhase()).isEqualTo(GameState.Phase.DRAWING);
        assertThat(gameState.getWordGroup()).isSameAs(wordGroup);
        assertThat(gameState.getSecretWord()).isIn("guitarra", "piano", "violonchelo");
        assertThat(gameState.getHintWord()).isIn("guitarra", "piano", "violonchelo");
        assertThat(gameState.getHintWord()).isNotEqualTo(gameState.getSecretWord());
        assertThat(gameState.getDrawingOrder()).containsExactlyInAnyOrder(11L, 22L, 33L);
        assertThat(gameState.getAlivePlayers()).containsExactlyInAnyOrder(11L, 22L, 33L);
        assertThat(gameState.getImpostorId()).isIn(11L, 22L, 33L);

        verify(roomRepository).save(room);
        assertThat(room.getGameState()).isEqualTo(Room.GameState.PLAYING);
        assertThat(room.getWordGroup()).isSameAs(wordGroup);
        assertThat(room.getSecretWord()).isEqualTo(gameState.getSecretWord());
        assertThat(room.getHintWord()).isEqualTo(gameState.getHintWord());

        ArgumentCaptor<Runnable> initRunnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(initRunnableCaptor.capture(), eq(3L), eq(TimeUnit.SECONDS));
        initRunnableCaptor.getValue().run();

        ArgumentCaptor<RoleAssignment> roleCaptor = ArgumentCaptor.forClass(RoleAssignment.class);
        verify(realtimePublisher, times(3)).sendRoleAssignment(anyLong(), roleCaptor.capture());

        long impostorAssignments = roleCaptor.getAllValues().stream().filter(RoleAssignment.Impostor.class::isInstance).count();
        long painterAssignments = roleCaptor.getAllValues().stream().filter(RoleAssignment.Painter.class::isInstance).count();

        assertThat(impostorAssignments).isEqualTo(1);
        assertThat(painterAssignments).isEqualTo(2);

        RoleAssignment.Impostor impostorAssignment = roleCaptor.getAllValues().stream()
                .filter(RoleAssignment.Impostor.class::isInstance)
                .map(RoleAssignment.Impostor.class::cast)
                .findFirst()
                .orElseThrow();
        assertThat(impostorAssignment.type()).isEqualTo("ROLE_ASSIGNMENT");
        assertThat(impostorAssignment.role()).isEqualTo("IMPOSTOR");
        assertThat(impostorAssignment.lives()).isEqualTo(1);
    }

    @Test
    void initializeGame_isIdempotent_whenCalledTwiceForSameRoom() {
        Room room = roomWithPlayersAndTiming(30, 0);
        WordGroup wordGroup = new WordGroup("guitarra", "piano", "violonchelo", "manual", "es");

        when(roomRepository.findByRoomCode(ROOM_CODE)).thenReturn(Optional.of(room));
        when(wordGroupRepository.findRandom()).thenReturn(Optional.of(wordGroup));
        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doReturn(scheduledFuture).when(scheduler).schedule(any(Runnable.class), anyLong(), eq(TimeUnit.SECONDS));

        GameState first = service.initializeGame(ROOM_CODE);
        GameState second = service.initializeGame(ROOM_CODE);

        assertThat(second).isSameAs(first);
        verify(roomRepository, times(1)).findByRoomCode(ROOM_CODE);
        verify(wordGroupRepository, times(1)).findRandom();
        verify(roomRepository, times(1)).save(room);
        
        ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler, times(1)).schedule(runnableCaptor.capture(), eq(3L), eq(TimeUnit.SECONDS));
        runnableCaptor.getValue().run();
        
        verify(realtimePublisher, times(3)).sendRoleAssignment(anyLong(), any(RoleAssignment.class));
    }

    @Test
    void endTurn_whenLastDrawerFinishes_entersGalleryAndSchedulesVoteTimer() {
        Room room = roomWithPlayersAndTiming(30, 0);
        WordGroup wordGroup = new WordGroup("guitarra", "piano", "violonchelo", "manual", "es");

        when(roomRepository.findByRoomCode(ROOM_CODE)).thenReturn(Optional.of(room));
        when(wordGroupRepository.findRandom()).thenReturn(Optional.of(wordGroup));
        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doReturn(scheduledFuture).when(scheduler).schedule(any(Runnable.class), anyLong(), eq(TimeUnit.SECONDS));

        GameState gameState = service.initializeGame(ROOM_CODE);
        gameState.recordCanvasSnapshot(11L, "data:image/png;base64,111");
        gameState.recordCanvasSnapshot(22L, "data:image/png;base64,222");
        gameState.recordCanvasSnapshot(33L, "data:image/png;base64,333");

        gameState.advanceDrawer();
        gameState.advanceDrawer();
        Long lastDrawer = gameState.getCurrentDrawer();

        ReflectionTestUtils.invokeMethod(service, "endTurn", ROOM_CODE, lastDrawer);

        assertThat(gameState.getPhase()).isEqualTo(GameState.Phase.GALLERY);
        verify(messagingTemplate).convertAndSend(eq("/topic/room.ABC123.game"), any(GalleryPhaseEvent.class));
        verify(scheduler, times(2)).schedule(any(Runnable.class), anyLong(), eq(TimeUnit.SECONDS));
        verify(scheduler).schedule(any(Runnable.class), eq(15L), eq(TimeUnit.SECONDS));

        ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler, times(2)).schedule(runnableCaptor.capture(), anyLong(), eq(TimeUnit.SECONDS));
        Runnable voteRunnable = runnableCaptor.getAllValues().get(1);
        voteRunnable.run();

        assertThat(gameState.getPhase()).isEqualTo(GameState.Phase.VOTING);
        assertThat(gameState.getCanvasSnapshots()).isEmpty();
    }

    @Test
    void enterGalleryPhase_publishesSnapshotsForAllDrawers() {
        Room room = roomWithPlayersAndTiming(30, 0);
        WordGroup wordGroup = new WordGroup("guitarra", "piano", "violonchelo", "manual", "es");

        when(roomRepository.findByRoomCode(ROOM_CODE)).thenReturn(Optional.of(room));
        when(wordGroupRepository.findRandom()).thenReturn(Optional.of(wordGroup));
        when(roomRepository.save(any(Room.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doReturn(scheduledFuture).when(scheduler).schedule(any(Runnable.class), anyLong(), eq(TimeUnit.SECONDS));

        GameState gameState = service.initializeGame(ROOM_CODE);
        gameState.recordCanvasSnapshot(11L, "data:image/png;base64,111");
        gameState.recordCanvasSnapshot(22L, "data:image/png;base64,222");
        gameState.recordCanvasSnapshot(33L, "data:image/png;base64,333");

        gameState.advanceDrawer();
        gameState.advanceDrawer();
        Long lastDrawer = gameState.getCurrentDrawer();

        ReflectionTestUtils.invokeMethod(service, "endTurn", ROOM_CODE, lastDrawer);

        ArgumentCaptor<GalleryPhaseEvent> eventCaptor = ArgumentCaptor.forClass(GalleryPhaseEvent.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/room.ABC123.game"), eventCaptor.capture());

        GalleryPhaseEvent event = eventCaptor.getValue();
        assertThat(event.type()).isEqualTo("GALLERY_PHASE");
        assertThat(event.snapshots()).hasSize(3);
        assertThat(event.snapshots())
                .extracting(snapshot -> snapshot.playerId())
                .containsExactlyInAnyOrder(11L, 22L, 33L);
        assertThat(event.snapshots())
                .extracting(snapshot -> snapshot.dataUrl())
                .containsExactlyInAnyOrder(
                        "data:image/png;base64,111",
                        "data:image/png;base64,222",
                        "data:image/png;base64,333");
    }

    private Room roomWithPlayersAndTiming(int drawTime, int impostorTries) {
        Room room = new Room();
        room.setRoomCode(ROOM_CODE);
        room.setMode(Room.Mode.CUSTOM);
        room.setDrawTime(drawTime);
        room.setImpostorTries(impostorTries);
        room.setPlayersNames(List.of(
                user(11L, "alice"),
                user(22L, "bob"),
                user(33L, "carol")
        ));
        return room;
    }

    private User user(Long id, String username) {
        User user = new User();
        user.setId(id);
        user.setEmail(username + "@example.com");
        user.setUsername(username);
        user.setPassword("secret");
        return user;
    }
}