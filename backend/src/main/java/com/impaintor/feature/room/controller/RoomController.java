package com.impaintor.feature.room.controller;

import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.models.Room.Mode;
import com.impaintor.feature.room.utilities.RandomGenerations;

import lombok.val;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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
    private RoomRepository roomRepository;

    @PostMapping("/create")
    public Room createRoom() {
        Room room = new Room();
        
        Long seed = RandomGenerations.RoomRandomId();
        String codigoFinal = RandomGenerations.CodifyRoomId(seed);
        
        room.setId(codigoFinal);
        
        Room savedRoom = roomRepository.save(room);
        
        return savedRoom;
    }

    @PostMapping("/{code}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String code, @RequestBody Player playerName){  //PENDIENTE CLASE PLAYER
        Optional<Room> oRoom = roomRepository.findById(code);
        if(oRoom.isEmpty()){return ResponseEntity.notFound().build();}

        Room room = oRoom.get();
/* 
               METODO A IMPLEMENTAR
                |   |   |   |   |
                v   v   v   v   v
*/
        if(room.getPlayersNames().contains(playerName)){
            return ResponseEntity.badRequest().body("El jugador ya está en la sala");
        }
/* 
                              METODO A IMPLEMENTAR
                                |   |   |   |   |
                                v   v   v   v   v
*/
        if(room.getSize() <= room.getPlayersNames().size()){
            return ResponseEntity.badRequest().body("La sala está llena");
        }
/* 
            METODO A IMPLEMENTAR
            |   |   |   |   |
            v   v   v   v   v
*/
        room.getPlayersNames().add(playerName);
        roomRepository.save(room);

        return ResponseEntity.ok(room);
    }

    @PostMapping("/{code}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable String code, @RequestBody Player playerName){  //PENDIENTE CLASE PLAYER
        Optional<Room> oRoom = roomRepository.findById(code);
        Room room = oRoom.get();
/* 
               METODO A IMPLEMENTAR
                |   |   |   |   |
                v   v   v   v   v
*/
        if(!room.getPlayersNames().contains(playerName)){
            return ResponseEntity.badRequest().body("El jugador no está en la sala");
        }
/* 
            METODO A IMPLEMENTAR
            |   |   |   |   |
            v   v   v   v   v
*/
        room.getPlayersNames().remove(playerName);
        roomRepository.save(room);

        return ResponseEntity.ok().body("El jugador ha abandonado la partida");
    }

    @GetMapping("/{code}")
    public ResponseEntity<?> roomDetails(@PathVariable String code) {
        Optional<Room> oRoom = roomRepository.findById(code);
        
        if (oRoom.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(oRoom.get());
    }

    @PutMapping("/{code}/settings")
    public ResponseEntity<?> updateSettings(@PathVariable String code, @RequestBody Room settingsUpdate) {
        Optional<Room> oRoom = roomRepository.findById(code);
        
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
        Optional<Room> oRoom = roomRepository.findById(code);
        if (oRoom.isEmpty()) return ResponseEntity.notFound().build();

        Room room = oRoom.get();

        if (room.getGameState() != Room.GameState.WAITING) {
            return ResponseEntity.badRequest().body("La sala no está en espera.");
        }

        String error = validarRequisitosInicio(room);
        if (error != null) {
            return ResponseEntity.badRequest().body(error);
        }

        room.setGameState(Room.GameState.PLAYING);
        roomRepository.save(room);
        
        return ResponseEntity.ok(room);
    }

    private String validarRequisitosInicio(Room room) {
        int numJugadores = room.getPlayersNames().size();

        if (room.getMode() == Room.Mode.RANKED && numJugadores != 5) {
            return "El modo RANKED requiere exactamente 5 jugadores.";
        }
        
        if (numJugadores < 2) {
            return "Se necesitan al menos 2 jugadores para jugar.";
        }

        return null;
    }
}
