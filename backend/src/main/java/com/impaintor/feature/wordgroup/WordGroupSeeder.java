package com.impaintor.feature.wordgroup;

import com.impaintor.feature.wordgroup.models.WordGroup;
import com.impaintor.feature.wordgroup.repositories.WordGroupRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class WordGroupSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(WordGroupSeeder.class);
    private static final String CSV_PATH = "data/word_groups.csv";

    private final WordGroupRepository repository;

    public WordGroupSeeder(WordGroupRepository repository) {
        this.repository = repository;
    }

    @Override
    public void run(String... args) throws Exception {
        long existing = repository.countByLanguage("es");
        if (existing > 0) {
            log.info("WordGroup seed skipped: {} Spanish groups already in database.", existing);
            return;
        }

        log.info("Seeding word groups from {} ...", CSV_PATH);
        List<WordGroup> groups = parseCsv();
        repository.saveAll(groups);
        log.info("Seeded {} word groups.", groups.size());
    }

    private List<WordGroup> parseCsv() throws Exception {
        ClassPathResource resource = new ClassPathResource(CSV_PATH);
        List<WordGroup> result = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

            String header = reader.readLine(); // skip header
            if (header == null) throw new IllegalStateException("CSV is empty: " + CSV_PATH);

            String line;
            int lineNum = 1;
            while ((line = reader.readLine()) != null) {
                lineNum++;
                if (line.trim().isEmpty()) continue;

                String[] fields = parseCsvLine(line);
                if (fields.length != 6) {
                    log.warn("Skipping malformed CSV line {}: {}", lineNum, line);
                    continue;
                }

                WordGroup wg = new WordGroup(
                        fields[1].trim(),  // word1
                        fields[2].trim(),  // word2
                        fields[3].trim(),  // word3
                        fields[4].trim(),  // source
                        fields[5].trim()   // language
                );
                result.add(wg);
            }
        }
        return result;
    }

    /** Minimal CSV parser that handles double-quoted fields containing commas/spaces. */
    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                fields.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        fields.add(current.toString());
        return fields.toArray(new String[0]);
    }
}