package com.impaintor.feature.realtime.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.impaintor.feature.realtime.service.GameInputHandler;
import com.impaintor.feature.realtime.service.LoggingGameInputHandler;
import com.impaintor.feature.realtime.topic.AlwaysAllowMembershipChecker;
import com.impaintor.feature.realtime.topic.RoomMembershipChecker;

/**
 * Registra los stubs por defecto para SPIs que aún no tienen impl real
 * (Track B y Track H). Cuando esos tracks publiquen sus beans, el
 * {@link ConditionalOnMissingBean} retira automáticamente los stubs.
 */
@Configuration
public class RealtimeStubsConfig {

    /** PENDING — Track B (Rooms) proveerá una impl que consulte {@code RoomService}. */
    @Bean
    @ConditionalOnMissingBean(RoomMembershipChecker.class)
    public RoomMembershipChecker alwaysAllowMembershipChecker() {
        return new AlwaysAllowMembershipChecker();
    }

    /** PENDING — Track H (Game engine) proveerá {@code GameService} como impl. */
    @Bean
    @ConditionalOnMissingBean(GameInputHandler.class)
    public GameInputHandler loggingGameInputHandler() {
        return new LoggingGameInputHandler();
    }
}
