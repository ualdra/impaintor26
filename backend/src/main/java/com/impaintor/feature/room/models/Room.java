package com.impaintor.feature.room.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "rooms")
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private String id;

    @Column(name = "room_code", nullable = false, unique = true, length = 12)
    private String roomCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false)
    private Mode mode;

    @Column(name = "secret_word")
    private String secretWord;

    @Column(name = "hint_word")
    private String hintWord;

    @Enumerated(EnumType.STRING)
    @Column(name = "winning_side")
    private WinningSide winningSide;

    @Enumerated(EnumType.STRING)
    @Column(name = "end_condition")
    private EndCondition endCondition;

    @Column(name = "rounds")
    private Integer rounds;

    @CreationTimestamp
    @Column(name = "played_at", updatable = false)
    private LocalDateTime playedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_state", nullable = false)
    private GameState gameState;

    @Column(name = "size")
    private Integer size;


    /*PENDIENTE CONECTAR CON USUARIO y WORDGROUPS */


    // --- ENUMS ---

    public enum Mode { RANKED, CUSTOM, SWIRFTPLAY }
    public enum WinningSide { IMPAINTOR, PAINTOR }
    public enum EndCondition { VOTED_OUT, WORD_GUESSED, OUT_OF_LIVES, TIE_NOT_BROKEN, LAST_STANDING }
    public enum GameState { WAITING, PLAYING, FINISHED }

    // COSNTRUCTOR
    public Room() { /*CONSTRUCTOR VACÍO*/}

    // --- GETTERS Y SETTERS ---

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public Mode getMode() {
        return mode;
    }

    public void setMode(Mode mode) {
        this.mode = mode;
    }

    public String getSecretWord() {
        return secretWord;
    }

    public void setSecretWord(String secretWord) {
        this.secretWord = secretWord;
    }

    public String getHintWord() {
        return hintWord;
    }

    public void setHintWord(String hintWord) {
        this.hintWord = hintWord;
    }

    public WinningSide getWinningSide() {
        return winningSide;
    }

    public void setWinningSide(WinningSide winningSide) {
        this.winningSide = winningSide;
    }

    public EndCondition getEndCondition() {
        return endCondition;
    }

    public void setEndCondition(EndCondition endCondition) {
        this.endCondition = endCondition;
    }

    public Integer getRounds() {
        return rounds;
    }

    public void setRounds(Integer rounds) {
        this.rounds = rounds;
    }

    public LocalDateTime getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(LocalDateTime playedAt) {
        this.playedAt = playedAt;
    }

    public GameState getGameState() {
        return gameState;
    }

    public void setGameState(GameState gameState) {
        this.gameState = gameState;
    }

    public Integer getSize() {
        return size;
    }

    public void setSize(Integer size) {
        this.size = size;
    }
}