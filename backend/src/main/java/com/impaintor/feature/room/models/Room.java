package com.impaintor.feature.room.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;
import com.impaintor.feature.user.models.User;
import com.impaintor.feature.wordgroup.models.WordGroup;

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

    @Column(name="impostor_tries")
    private Integer impostorTries;

    @Column(name="draw_time")
    private Integer drawTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_group_id") 
    private WordGroup wordGroup;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "room_players", 
        joinColumns = @JoinColumn(name = "room_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private List<User> playersNames = new ArrayList<>();


    // --- ENUMS ---

    public enum Mode { RANKED, CUSTOM, SWIFTPLAY } 
    public enum WinningSide { IMPAINTOR, PAINTOR }
    public enum EndCondition { VOTED_OUT, WORD_GUESSED, OUT_OF_LIVES, TIE_NOT_BROKEN, LAST_STANDING }
    public enum GameState { WAITING, PLAYING, FINISHED }

    // CONSTRUCTOR
    public Room() { /*CONSTRUCTOR VACÍO*/}

    // --- GETTERS Y SETTERS ---

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Integer getImpostorTries(){
        return this.impostorTries;
    }

    public void setImpostorTries(Integer impostorTries){
        this.impostorTries=impostorTries;
    }

    public Integer getDrawTime(){
        return this.drawTime;
    }

    public void setDrawTime(Integer drawTime){
        this.drawTime=drawTime;
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

    public WordGroup getWordGroup() {
        return wordGroup;
    }

    public void setWordGroup(WordGroup wordGroup) {
        this.wordGroup = wordGroup;
    }

    public List<User> getPlayersNames() {
        return playersNames;
    }

    public void setPlayersNames(List<User> playerNames) {
        this.playersNames = playerNames;
    }
}