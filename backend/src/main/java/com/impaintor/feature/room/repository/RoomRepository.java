package com.impaintor.feature.room.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.impaintor.feature.room.models.Room;
import com.impaintor.feature.room.models.Room.GameState;
import java.util.List;


public interface RoomRepository extends JpaRepository<Room, String>{
    List<Room> findByGameState(GameState gameState);
    
}