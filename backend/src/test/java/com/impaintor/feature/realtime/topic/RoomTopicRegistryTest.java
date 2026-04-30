package com.impaintor.feature.realtime.topic;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RoomTopicRegistryTest {

    private final RoomTopicRegistry registry = new RoomTopicRegistry();

    @Test
    void registerRoom_marksRoomAsRegistered() {
        registry.registerRoom("ABC123");

        assertThat(registry.isRegistered("ABC123")).isTrue();
    }

    @Test
    void unknownRoom_isNotRegistered() {
        assertThat(registry.isRegistered("XYZ789")).isFalse();
    }

    @Test
    void registerRoom_isIdempotent() {
        registry.registerRoom("ABC123");
        registry.registerRoom("ABC123");

        assertThat(registry.isRegistered("ABC123")).isTrue();
        assertThat(registry.registeredRooms()).containsExactly("ABC123");
    }

    @Test
    void unregisterRoom_removesFromRegistry() {
        registry.registerRoom("ABC123");
        registry.unregisterRoom("ABC123");

        assertThat(registry.isRegistered("ABC123")).isFalse();
    }

    @Test
    void unregisterUnknownRoom_isNoOp() {
        registry.unregisterRoom("nope");

        assertThat(registry.registeredRooms()).isEmpty();
    }
}
