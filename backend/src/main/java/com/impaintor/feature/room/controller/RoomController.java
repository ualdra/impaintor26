package com.impaintor.feature.room.controller;

import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.utilities.RandomGenerations;
import com.rabbitmq.client.RpcClient.Response;

import lombok.val;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.impaintor.feature.room.repository.RoomRepository;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
        room.getPlayerNames().add(playerName);
        roomRepository.save(room);

        return ResponseEntity.ok(room);
    }

}
