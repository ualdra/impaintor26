package com.impaintor.feature.realtime.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.impaintor.feature.realtime.dto.inbound.ClearCanvasMessage;
import com.impaintor.feature.realtime.dto.inbound.Point;
import com.impaintor.feature.realtime.dto.inbound.StrokeMessage;
import com.impaintor.feature.realtime.dto.outbound.ClearCanvasBroadcast;
import com.impaintor.feature.realtime.dto.outbound.StrokeBroadcast;
import com.impaintor.feature.realtime.security.AuthenticatedUser;
import com.impaintor.feature.realtime.security.StompPrincipal;
import com.impaintor.feature.realtime.service.RealtimePublisher;
import com.impaintor.feature.realtime.topic.RoomMembershipChecker;

class DrawWebSocketControllerTest {

    private RealtimePublisher publisher;
    private RoomMembershipChecker membership;
    private DrawWebSocketController controller;

    @BeforeEach
    void setUp() {
        publisher = mock(RealtimePublisher.class);
        membership = mock(RoomMembershipChecker.class);
        controller = new DrawWebSocketController(publisher, membership);
    }

    @Test
    void onDrawStroke_broadcastsWithPlayerIdFromPrincipal() {
        when(membership.isMember("ABC123", 42L)).thenReturn(true);
        StrokeMessage message = new StrokeMessage(List.of(new Point(1, 2)), "#FF0000", 3);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onDraw("ABC123", message, principal);

        ArgumentCaptor<StrokeBroadcast> captor = ArgumentCaptor.forClass(StrokeBroadcast.class);
        verify(publisher).broadcastStroke(eq("ABC123"), captor.capture());
        StrokeBroadcast broadcast = captor.getValue();
        assertThat(broadcast.playerId()).isEqualTo(42L);
        assertThat(broadcast.points()).containsExactly(new Point(1, 2));
        assertThat(broadcast.color()).isEqualTo("#FF0000");
        assertThat(broadcast.thickness()).isEqualTo(3);
        assertThat(broadcast.type()).isEqualTo("STROKE");
    }

    @Test
    void onDrawClear_broadcastsWithPlayerIdFromPrincipal() {
        when(membership.isMember("ABC123", 42L)).thenReturn(true);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onDraw("ABC123", new ClearCanvasMessage(), principal);

        ArgumentCaptor<ClearCanvasBroadcast> captor = ArgumentCaptor.forClass(ClearCanvasBroadcast.class);
        verify(publisher).broadcastClear(eq("ABC123"), captor.capture());
        assertThat(captor.getValue().playerId()).isEqualTo(42L);
        assertThat(captor.getValue().type()).isEqualTo("CLEAR");
    }

    @Test
    void onDrawStroke_dropsMessageIfPlayerIsNotRoomMember() {
        when(membership.isMember("ABC123", 42L)).thenReturn(false);
        StrokeMessage message = new StrokeMessage(List.of(new Point(1, 2)), "#000000", 1);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onDraw("ABC123", message, principal);

        verify(publisher, never()).broadcastStroke(any(), any());
    }

    @Test
    void onDrawClear_dropsMessageIfPlayerIsNotRoomMember() {
        when(membership.isMember("ABC123", 42L)).thenReturn(false);
        StompPrincipal principal = new StompPrincipal(new AuthenticatedUser(42L, "alice"));

        controller.onDraw("ABC123", new ClearCanvasMessage(), principal);

        verify(publisher, never()).broadcastClear(any(), any());
    }
}
