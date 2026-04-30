package com.impaintor.feature.realtime.controller;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.impaintor.feature.realtime.dto.inbound.GuessMessage;
import com.impaintor.feature.realtime.dto.inbound.VoteMessage;
import com.impaintor.feature.realtime.security.AuthenticatedUser;
import com.impaintor.feature.realtime.security.StompPrincipal;
import com.impaintor.feature.realtime.service.GameInputHandler;
import com.impaintor.feature.realtime.topic.RoomMembershipChecker;

class GameInputWebSocketControllerTest {

    private GameInputHandler handler;
    private RoomMembershipChecker membership;
    private GameInputWebSocketController controller;

    @BeforeEach
    void setUp() {
        handler = mock(GameInputHandler.class);
        membership = mock(RoomMembershipChecker.class);
        controller = new GameInputWebSocketController(handler, membership);
    }

    @Test
    void onVote_forwardsToHandlerWithVoterFromPrincipal() {
        when(membership.isMember("ABC123", 42L)).thenReturn(true);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onVote("ABC123", new VoteMessage(7L), principal);

        verify(handler).onVote("ABC123", 42L, 7L);
    }

    @Test
    void onGuess_forwardsToHandlerWithImpostorFromPrincipal() {
        when(membership.isMember("ABC123", 42L)).thenReturn(true);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onGuess("ABC123", new GuessMessage("guitarra"), principal);

        verify(handler).onGuess("ABC123", 42L, "guitarra");
    }

    @Test
    void onVote_dropsMessageIfNotMember() {
        when(membership.isMember("ABC123", 42L)).thenReturn(false);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onVote("ABC123", new VoteMessage(7L), principal);

        verify(handler, never()).onVote(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    void onGuess_dropsMessageIfNotMember() {
        when(membership.isMember("ABC123", 42L)).thenReturn(false);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onGuess("ABC123", new GuessMessage("guitarra"), principal);

        verify(handler, never()).onGuess(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }
}
