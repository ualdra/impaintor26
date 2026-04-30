package com.impaintor.feature.realtime.dto.inbound;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Comando de dibujo entrante. El cliente envía a {@code /app/room.{code}.draw}
 * con un campo {@code type} = {@code STROKE} | {@code CLEAR}.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = StrokeMessage.class, name = "STROKE"),
        @JsonSubTypes.Type(value = ClearCanvasMessage.class, name = "CLEAR")
})
public sealed interface DrawCommand permits StrokeMessage, ClearCanvasMessage {
}
