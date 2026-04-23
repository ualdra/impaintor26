package com.impaintor.feature.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.models.Room.GameState;
import java.util.List;
import java.util.Optional;


public interface RoomRepository extends JpaRepository<Room, String>{
    Optional<Room> findByRoomCode(String roomCode);

    List<Room> findByGameState(GameState gameState);

    boolean existsByRoomCode(String roomCode);

    List<Room> findByMode(Room.Mode mode);
    
}