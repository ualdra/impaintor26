package com.impaintor.feature.realtime.dto.inbound;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Mensaje entrante de trazo. {@code playerId} del cliente se ignora a propósito —
 * el id real se toma del Principal autenticado para evitar suplantación.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record StrokeMessage(List<Point> points, String color, int thickness) implements DrawCommand {
}
