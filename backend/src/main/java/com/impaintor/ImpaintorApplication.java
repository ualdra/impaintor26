package com.impaintor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class ImpaintorApplication {

    public static void main(String[] args) {
        SpringApplication.run(ImpaintorApplication.class, args);
    }
}
