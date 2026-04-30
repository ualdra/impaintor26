package com.impaintor.feature.realtime.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.impaintor.feature.realtime.dto.inbound.Point;
import com.impaintor.feature.realtime.dto.outbound.ClearCanvasBroadcast;
import com.impaintor.feature.realtime.dto.outbound.GameEvent;
import com.impaintor.feature.realtime.dto.outbound.GuessResult;
import com.impaintor.feature.realtime.dto.outbound.RoleAssignment;
import com.impaintor.feature.realtime.dto.outbound.StrokeBroadcast;

class RealtimePublisherTest {

    private SimpMessagingTemplate messaging;
    private RealtimePublisher publisher;

    @BeforeEach
    void setUp() {
        messaging = mock(SimpMessagingTemplate.class);
        publisher = new RealtimePublisher(messaging);
    }

    @Test
    void broadcastStroke_sendsToDrawTopic() {
        StrokeBroadcast stroke = new StrokeBroadcast(42L, List.of(new Point(1, 2)), "#FF0000", 3);

        publisher.broadcastStroke("ABC123", stroke);

        verify(messaging).convertAndSend(eq("/topic/room.ABC123.draw"), eq(stroke));
    }

    @Test
    void broadcastClear_sendsToDrawTopic() {
        ClearCanvasBroadcast clear = new ClearCanvasBroadcast(42L);

        publisher.broadcastClear("ABC123", clear);

        verify(messaging).convertAndSend(eq("/topic/room.ABC123.draw"), eq(clear));
    }

    @Test
    void publishGameEvent_sendsToGameTopic() {
        GameEvent.GameStart event = new GameEvent.GameStart(List.of(5L, 42L, 17L), 1);

        publisher.publishGameEvent("ABC123", event);

        verify(messaging).convertAndSend(eq("/topic/room.ABC123.game"), any(GameEvent.class));
    }

    @Test
    void publishGameEvent_routesAllGameEventVariants() {
        publisher.publishGameEvent("R", new GameEvent.TurnStart(5L, 30));
        publisher.publishGameEvent("R", new GameEvent.TurnEnd(5L));
        publisher.publishGameEvent("R", new GameEvent.GalleryPhase());
        publisher.publishGameEvent("R", new GameEvent.VotePhase(30));
        publisher.publishGameEvent("R", new GameEvent.VoteResult(17L, false, List.of(new GameEvent.TopVote(17L, 3))));
        publisher.publishGameEvent("R", new GameEvent.VoteTie(List.of(new GameEvent.TopVote(8L, 3)), 15));
        publisher.publishGameEvent("R", new GameEvent.GuessAttempt(0, false));
        publisher.publishGameEvent("R", new GameEvent.NewRound(2, List.of(5L, 42L)));
        publisher.publishGameEvent("R", new GameEvent.GameOver("PAINTERS", "VOTED_OUT", 8L, "guitarra"));

        verify(messaging, org.mockito.Mockito.times(9))
                .convertAndSend(eq("/topic/room.R.game"), any(GameEvent.class));
    }

    @Test
    void sendRoleAssignment_painter_goesToUserPrivateQueue() {
        RoleAssignment.Painter assignment = new RoleAssignment.Painter("guitarra");

        publisher.sendRoleAssignment(42L, assignment);

        verify(messaging).convertAndSendToUser(eq("42"), eq("/queue/private"), eq(assignment));
    }

    @Test
    void sendRoleAssignment_impostor_goesToUserPrivateQueue() {
        RoleAssignment.Impostor assignment = new RoleAssignment.Impostor("piano", 1);

        publisher.sendRoleAssignment(42L, assignment);

        verify(messaging).convertAndSendToUser(eq("42"), eq("/queue/private"), eq(assignment));
    }

    @Test
    void sendGuessResult_goesToUserPrivateQueue() {
        GuessResult result = new GuessResult(false, 0);

        publisher.sendGuessResult(42L, result);

        verify(messaging).convertAndSendToUser(eq("42"), eq("/queue/private"), eq(result));
    }
}
