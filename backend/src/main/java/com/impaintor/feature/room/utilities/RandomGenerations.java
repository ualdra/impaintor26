package com.impaintor.feature.room.utilities;

import java.util.Random;

public class RandomGenerations {

    private RandomGenerations(){
        //CONSTRUCTOR VACIO
    }

    public static Long RoomRandomId(){
        return System.nanoTime();
    }

    public static String CodifyRoomId(Long id){
        Random rnd = new Random(id);
        StringBuilder sb = new StringBuilder();

        for (int i = 0; i < 4; i++) {
            sb.append(rnd.nextInt(10));
        }

        for (int i = 0; i < 3; i++) {
            char letra = (char) ('A' + rnd.nextInt(26));
            sb.append(letra);
        }

        return sb.toString();
    }

}
