package com.impaintor.feature.realtime.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.impaintor.feature.realtime.topic.AlwaysAllowMembershipChecker;
import com.impaintor.feature.realtime.topic.RoomMembershipChecker;

@Configuration
public class RealtimeStubsConfig {

    @Bean
    @ConditionalOnMissingBean(RoomMembershipChecker.class)
    public RoomMembershipChecker alwaysAllowMembershipChecker() {
        return new AlwaysAllowMembershipChecker();
    }
}
