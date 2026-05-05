package com.impaintor.feature.wordgroup.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "word_groups")
public class WordGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String word1;

    @Column(nullable = false, length = 100)
    private String word2;

    @Column(nullable = false, length = 100)
    private String word3;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(nullable = false, length = 5)
    private String language;

    public WordGroup() {}

    public WordGroup(String word1, String word2, String word3, String source, String language) {
        this.word1 = word1;
        this.word2 = word2;
        this.word3 = word3;
        this.source = source;
        this.language = language;
    }

    public Long getId() { return id; }
    public String getWord1() { return word1; }
    public String getWord2() { return word2; }
    public String getWord3() { return word3; }
    public String getSource() { return source; }
    public String getLanguage() { return language; }

    public void setWord1(String word1) { this.word1 = word1; }
    public void setWord2(String word2) { this.word2 = word2; }
    public void setWord3(String word3) { this.word3 = word3; }
    public void setSource(String source) { this.source = source; }
    public void setLanguage(String language) { this.language = language; }
}