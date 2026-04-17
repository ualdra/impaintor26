package com.impaintor.feature.room.models;

import java.security.Timestamp;
import jakarta.persistence.*;

@Entity
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    private String roomCode;
    private enum mode{RANKED, CUSTOM, SWIRFTPLAY}
    private String secretWord;
    private String hintWord;
    private enum winningSide{ IMPAINTOR, PAINTOR}
    private enum endCondition{VOTED_OUT, WORD_GUESSED, OUT_OF_LIVES, TIE_NOT_BROKEN, LAST_STANDING}
    private Integer rounds;
    private Timestamp playedAt;

    @OneToOne(cascade = CascadeType.ALL)
    private Long wordGroupId;

    @OneToOne(cascade = CascadeType.ALL)
    private Long impostorId;

    public long getId() {
        return id;
    }
    public void setId(long id) {
        this.id = id;
    }
    public String getRoomCode() {
        return roomCode;
    }
    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }
    public mode getMode() {
        return mode;
    }
    public void setMode(mode mode) {
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
    public winningSide getWinningSide() {
        return winningSide;
    }
    public void setWinningSide(winningSide winningSide) {
        this.winningSide = winningSide;
    }
    public endCondition getEndCondition() {
        return endCondition;
    }
    public void setEndCondition(endCondition endCondition) {
        this.endCondition = endCondition;
    }
    public Integer getRounds() {
        return rounds;
    }
    public void setRounds(Integer rounds) {
        this.rounds = rounds;
    }
    public Timestamp getPlayedAt() {
        return playedAt;
    }
    public void setPlayedAt(Timestamp playedAt) {
        this.playedAt = playedAt;
    }
    public Long getWordGroupId() {
        return wordGroupId;
    }
    public void setWordGroupId(Long wordGroupId) {
        this.wordGroupId = wordGroupId;
    }
    public Long getImpostorId() {
        return impostorId;
    }
    public void setImpostorId(Long impostorId) {
        this.impostorId = impostorId;
    } 

}

