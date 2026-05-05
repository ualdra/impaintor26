package com.impaintor.feature.wordgroup.controller;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.impaintor.feature.wordgroup.models.WordGroup;
import com.impaintor.feature.wordgroup.repositories.WordGroupRepository;

// TODO: Cuando exista la clase User y la integración con auth (Track A),
//       proteger los endpoints POST y DELETE con @PreAuthorize("hasRole('ADMIN')").
//       Los admins se pueden definir en application.yml mediante una lista impaintor.admin-emails.

@RestController
@RequestMapping("api/words")
public class WordGroupController {

    @Autowired
    private WordGroupRepository wordGroupRepository;

    @GetMapping
    public ResponseEntity<?> listWordGroups(Pageable pageable) {
        Page<WordGroup> page = wordGroupRepository.findAll(pageable);
        return ResponseEntity.ok(page);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getWordGroup(@PathVariable Long id) {
        Optional<WordGroup> oGroup = wordGroupRepository.findById(id);
        if (oGroup.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(oGroup.get());
    }

    @PostMapping
    public ResponseEntity<?> createWordGroup(@RequestBody WordGroup wordGroup) {
        // TODO: cuando exista User+auth, exigir rol ADMIN.

        String error = validateNewWordGroup(wordGroup);
        if (error != null) {
            return ResponseEntity.badRequest().body(error);
        }

        // El id no se puede setear desde el cliente (la entidad no tiene setId).
        // Forzar el resto de campos administrativos.
        wordGroup.setSource("manual");
        if (wordGroup.getLanguage() == null || wordGroup.getLanguage().isBlank()) {
            wordGroup.setLanguage("es");
        }

        WordGroup saved = wordGroupRepository.save(wordGroup);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteWordGroup(@PathVariable Long id) {
        // TODO: cuando exista User+auth, exigir rol ADMIN.

        if (!wordGroupRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        wordGroupRepository.deleteById(id);
        return ResponseEntity.ok().body("Grupo de palabras eliminado");
    }

    /**
     * Valida un WordGroup recibido del cliente.
     * Reglas:
     *  - Las 3 palabras existen y no están vacías
     *  - word1 (palabra secreta) es una sola palabra (sin espacios), 2-50 caracteres
     *  - word2, word3 (pistas) pueden ser frases, 2-100 caracteres
     *  - Todas tienen sólo caracteres alfabéticos (incluye acentos y ñ)
     *  - Las 3 palabras son distintas entre sí
     */
    private String validateNewWordGroup(WordGroup wg) {
        if (wg == null) return "El cuerpo de la petición está vacío";

        String w1 = trimOrNull(wg.getWord1());
        String w2 = trimOrNull(wg.getWord2());
        String w3 = trimOrNull(wg.getWord3());

        if (w1 == null) return "word1 es obligatorio";
        if (w2 == null) return "word2 es obligatorio";
        if (w3 == null) return "word3 es obligatorio";

        if (w1.length() < 2 || w1.length() > 50) {
            return "word1 debe tener entre 2 y 50 caracteres";
        }
        if (w2.length() < 2 || w2.length() > 100) {
            return "word2 debe tener entre 2 y 100 caracteres";
        }
        if (w3.length() < 2 || w3.length() > 100) {
            return "word3 debe tener entre 2 y 100 caracteres";
        }

        // Palabra secreta: una sola palabra, sin espacios
        if (!w1.toLowerCase().matches("[a-záéíóúñü]+")) {
            return "word1 (palabra secreta) debe ser una sola palabra alfabética";
        }

        // Pistas: pueden tener espacios, pero solo letras
        if (!w2.toLowerCase().matches("[a-záéíóúñü ]+")) {
            return "word2 sólo puede contener letras y espacios";
        }
        if (!w3.toLowerCase().matches("[a-záéíóúñü ]+")) {
            return "word3 sólo puede contener letras y espacios";
        }

        // Las 3 deben ser distintas
        if (w1.equalsIgnoreCase(w2) || w1.equalsIgnoreCase(w3) || w2.equalsIgnoreCase(w3)) {
            return "Las tres palabras deben ser distintas";
        }

        // Normalizar valores antes de guardar
        wg.setWord1(w1);
        wg.setWord2(w2);
        wg.setWord3(w3);

        return null;
    }

    private String trimOrNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}