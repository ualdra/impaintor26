package com.impaintor.feature.user.models;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * STUB PROVISIONAL — PENDING (Track A: Auth/Users).
 *
 * <p>Stub mínimo creado por Track D (P4) para desbloquear la compilación de
 * Track B (Rooms), que ya importa esta clase en {@code Room} (campo
 * {@code @ManyToMany List<User> playersNames}) y en {@code RoomController}
 * ({@code @RequestBody User}).</p>
 *
 * <p>Track A debe REEMPLAZAR este archivo completamente con su impl real
 * (validaciones, hash BCrypt para password, lógica de ELO, etc.). Los nombres de
 * campos coinciden con la sección 4.1 de CLAUDE.md para minimizar fricción
 * en el merge.</p>
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private Integer elo = 1000;

    @Column(name = "games_played", nullable = false)
    private Integer gamesPlayed = 0;

    @Column(name = "games_won", nullable = false)
    private Integer gamesWon = 0;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
