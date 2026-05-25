package com.impaintor.feature.game.model;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import com.impaintor.feature.wordgroup.models.WordGroup;

import lombok.Data;

/**
 * Estado de una partida activa.
 * Contiene ronda actual, fase, orden de dibujo, jugadores vivos, votos,
 * id del impostor, word group, palabra secreta y pista.
 */
@Data
public class GameState {

    public record CanvasSnapshot(Long playerId, String dataUrl) {}

    public enum Phase { DRAWING, GALLERY, VOTING, TIE_BREAK, RESULT }

    private int round = 1;
    private Phase phase = Phase.DRAWING;

    // Orden de dibujo
    private final List<Long> drawingOrder = Collections.synchronizedList(new ArrayList<>());

    // Jugadores vivos en la partida (IDs)
    private final Set<Long> alivePlayers = ConcurrentHashMap.newKeySet();

    // Mapa de votos: voterId -> votedPlayerId
    private final Map<Long, Long> votes = new ConcurrentHashMap<>();

    // Capturas de canvas por jugador para la ronda actual: playerId -> dataURL
    private final Map<Long, String> canvasSnapshots = new ConcurrentHashMap<>();

    // Id del impostor
    private Long impostorId;

    // Grupo de palabras usado 
    private WordGroup wordGroup;

    // Palabra secreta y pista
    private String secretWord;
    private String hintWord;

    // Duración de la fase de galería en segundos (configurable por sala al iniciar la partida).
    // Si es 0 indica que no se configuró y debe usarse el valor por defecto desde el servicio.
    private int gallerySeconds = 0;

    // Vidas del impostor para adivinar la palabra
    private int impostorLives = 0;

    // Índice del dibujante actual dentro de drawingOrder
    private int currentDrawerIndex = 0;

    // --- Constructores ---
    public GameState() {}

    public GameState(List<Long> initialOrder, Collection<Long> initialPlayers) {
        setDrawingOrder(initialOrder);
        setAlivePlayers(initialPlayers);
    }

    public List<Long> getDrawingOrder() { return Collections.unmodifiableList(drawingOrder); }
    public void setDrawingOrder(Collection<Long> order) {
        drawingOrder.clear();
        if (order != null) drawingOrder.addAll(order);
        this.currentDrawerIndex = 0;
    }

    public Set<Long> getAlivePlayers() { return Collections.unmodifiableSet(alivePlayers); }
    public void setAlivePlayers(Collection<Long> ids) {
        alivePlayers.clear();
        if (ids != null) alivePlayers.addAll(ids);
    }

    public Map<Long, Long> getVotes() { return Collections.unmodifiableMap(votes); }
    public void clearVotes() { votes.clear(); }

    public Map<Long, String> getCanvasSnapshots() { return Collections.unmodifiableMap(canvasSnapshots); }
    public void recordCanvasSnapshot(Long playerId, String dataUrl) {
        if (playerId == null || dataUrl == null || dataUrl.isBlank()) return;
        canvasSnapshots.put(playerId, dataUrl);
    }
    public void clearCanvasSnapshots() { canvasSnapshots.clear(); }

    public Long getCurrentDrawer() {
        synchronized (drawingOrder) {
            if (drawingOrder.isEmpty()) return null;
            if (currentDrawerIndex < 0 || currentDrawerIndex >= drawingOrder.size()) return null;
            return drawingOrder.get(currentDrawerIndex);
        }
    }

    public void advanceDrawer() { currentDrawerIndex++; }

    // --- Vote helpers ---
    public void recordVote(Long voterId, Long votedPlayerId) {
        if (voterId == null) return;
        if (votedPlayerId == null) {
            votes.remove(voterId);
        } else {
            votes.put(voterId, votedPlayerId);
        }
    }

    // --- Utility ---
    public boolean isPlayerAlive(Long playerId) { return alivePlayers.contains(playerId); }
    public void eliminatePlayer(Long playerId) { alivePlayers.remove(playerId); }

}
