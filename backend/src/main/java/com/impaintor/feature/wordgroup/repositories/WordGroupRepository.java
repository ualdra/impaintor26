package com.impaintor.feature.wordgroup.repositories;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.impaintor.feature.wordgroup.models.WordGroup;

@Repository
public interface WordGroupRepository extends JpaRepository<WordGroup, Long> {

    /**
     * Returns a single random WordGroup. Used at game start to pick the secret word.
     * Implemented via PostgreSQL's RANDOM(), won't work on H2 or MySQL without modification.
     */
    @Query(value = "SELECT * FROM word_groups ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Optional<WordGroup> findRandom();

    long countByLanguage(String language);
}