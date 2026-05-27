package com.impaintor.feature.game.model;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

class GameStateTest {

    @Test
    void defaults_andCoreMutationsWorkAsExpected() {
        GameState state = new GameState();

        assertThat(state.getRound()).isEqualTo(1);
        assertThat(state.getPhase()).isEqualTo(GameState.Phase.DRAWING);
        assertThat(state.getDrawingOrder()).isEmpty();
        assertThat(state.getAlivePlayers()).isEmpty();
        assertThat(state.getVotes()).isEmpty();
        assertThat(state.getCanvasSnapshots()).isEmpty();

        state.setDrawingOrder(List.of(10L, 20L, 30L));
        state.setAlivePlayers(Set.of(10L, 20L, 30L));
        state.recordVote(10L, 20L);
        state.recordCanvasSnapshot(10L, "data:image/png;base64,AAA");
        state.recordCanvasSnapshot(20L, "   ");

        assertThat(state.getCurrentDrawer()).isEqualTo(10L);
        assertThat(state.isPlayerAlive(20L)).isTrue();
        assertThat(state.getVotes()).containsEntry(10L, 20L);
        assertThat(state.getCanvasSnapshots()).containsEntry(10L, "data:image/png;base64,AAA");
        assertThat(state.getCanvasSnapshots()).doesNotContainKey(20L);

        state.advanceDrawer();
        assertThat(state.getCurrentDrawer()).isEqualTo(20L);

        state.eliminatePlayer(20L);
        assertThat(state.isPlayerAlive(20L)).isFalse();

        state.clearVotes();
        state.clearCanvasSnapshots();
        assertThat(state.getVotes()).isEmpty();
        assertThat(state.getCanvasSnapshots()).isEmpty();
    }

    @Test
    void returnedCollectionsAreUnmodifiable() {
        GameState state = new GameState(List.of(1L, 2L), List.of(1L, 2L));

        assertThatThrownBy(() -> state.getDrawingOrder().add(3L))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> state.getAlivePlayers().add(3L))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> state.getVotes().put(1L, 2L))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> state.getCanvasSnapshots().put(1L, "x"))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}