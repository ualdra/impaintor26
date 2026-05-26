package com.impaintor.feature.game.model;

import java.util.List;

/**
 * Evento de galería emitido desde game con las capturas de la ronda actual.
 */
public record GalleryPhaseEvent(String type, List<GameState.CanvasSnapshot> snapshots, int timeSeconds) {

    public GalleryPhaseEvent(List<GameState.CanvasSnapshot> snapshots, int timeSeconds) {
        this("GALLERY_PHASE", snapshots, timeSeconds);
    }
}