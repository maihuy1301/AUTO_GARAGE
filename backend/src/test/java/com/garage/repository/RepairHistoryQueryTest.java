package com.garage.repository;

import jakarta.persistence.Entity;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.data.jpa.repository.Query;

/** Validate JPQL against all real mappings without connecting to or changing the database. */
class RepairHistoryQueryTest {
    @Test void queriesResolveAgainstRealEntityMappings() throws Exception {
        var registry = new StandardServiceRegistryBuilder()
            .applySetting("hibernate.dialect", "org.hibernate.dialect.SQLServerDialect")
            .applySetting("hibernate.temp.use_jdbc_metadata_defaults", "false")
            .applySetting("hibernate.hbm2ddl.auto", "none").build();
        try {
            var sources = new MetadataSources(registry);
            var scanner = new ClassPathScanningCandidateComponentProvider(false);
            scanner.addIncludeFilter(new AnnotationTypeFilter(Entity.class));
            for (var bean : scanner.findCandidateComponents("com.garage.entity"))
                sources.addAnnotatedClass(Class.forName(bean.getBeanClassName()));
            try (var factory = sources.buildMetadata().buildSessionFactory(); var session = factory.openSession()) {
                for (var method : RepairHistoryRepository.class.getDeclaredMethods()) {
                    var annotation = method.getAnnotation(Query.class);
                    if (annotation != null) session.createQuery(annotation.value(), jakarta.persistence.Tuple.class);
                }
            }
        } finally { StandardServiceRegistryBuilder.destroy(registry); }
    }
}
