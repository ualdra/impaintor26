package com.impaintor.feature.room.controller;

import com.impaintor.feature.game.model.GameState;
import com.impaintor.feature.game.service.GameService;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.utilities.RandomGenerations;
import com.impaintor.feature.user.models.User;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.impaintor.feature.room.repository.RoomRepository;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("api/rooms")
public class RoomController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private GameService gameService;

    @PostMapping("/create")
    public ResponseEntity<?> createRoom() {
        Room room = new Room();

        Long seed = RandomGenerations.RoomRandomId();
        String codigoFinal = RandomGenerations.CodifyRoomId(seed);

        room.setRoomCode(codigoFinal);
        room.setMode(Room.Mode.CUSTOM);
        room.setGameState(Room.GameState.WAITING);

        Room saved = roomRepository.save(room);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/{code}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String code, @RequestBody User user) {
        Optional<Room> oRoom = roomRepository.findByRoomCode(code);
        if (oRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Room room = oRoom.get();

        if (room.getPlayersNames().contains(user)) {
            return ResponseEntity.badRequest().body("El jugador ya está en la sala");
        }

        if (room.getSize() != null && room.getPlayersNames().size() >= room.getSize()) {
            return ResponseEntity.badRequest().body("La sala está llena");
        }

        room.getPlayersNames().add(user);
        roomRepository.save(room);

        messagingTemplate.convertAndSend("/topic/room/" + code, room);

        return ResponseEntity.ok(room);
    }

    @PostMapping("/{code}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable String code, @RequestBody User user) {
        Optional<Room> oRoom = roomRepository.findByRoomCode(code);

        if (oRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Room room = oRoom.get();

        if (!room.getPlayersNames().contains(user)) {
            return ResponseEntity.badRequest().body("El jugador no está en la sala");
        }

        room.getPlayersNames().remove(user);
        roomRepository.save(room);

        return ResponseEntity.ok().body("El jugador ha abandonado la partida");
    }

    @GetMapping("/{code}")
    public ResponseEntity<?> roomDetails(@PathVariable String code) {
        Optional<Room> oRoom = roomRepository.findByRoomCode(code);

        if (oRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(oRoom.get());
    }

    @PutMapping("/{code}/settings")
    public ResponseEntity<?> updateSettings(@PathVariable String code, @RequestBody Room settingsUpdate) {
        Optional<Room> oRoom = roomRepository.findByRoomCode(code);

        if (oRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Room room = oRoom.get();

        if (settingsUpdate.getImpostorTries() != null) room.setImpostorTries(settingsUpdate.getImpostorTries());
        if (settingsUpdate.getDrawTime() != null) room.setDrawTime(settingsUpdate.getDrawTime());

        Room savedRoom = roomRepository.save(room);
        return ResponseEntity.ok(savedRoom);
    }

    @PostMapping("/{code}/start")
    public ResponseEntity<?> startGame(@PathVariable String code) {
        try {
            GameState gameState = gameService.initializeGame(code);
            return ResponseEntity.ok(gameState);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(ex.getMessage());
        }
    }
}
