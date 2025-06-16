# Dockerfile для Keycloak с предустановленной PostgreSQL поддержкой
FROM quay.io/keycloak/keycloak:24.0.1 as builder

# Используем ADD вместо RUN для скачивания файла
ADD https://jdbc.postgresql.org/download/postgresql-42.7.3.jar /opt/keycloak/providers/postgresql.jar

# Предварительная сборка с PostgreSQL
RUN /opt/keycloak/bin/kc.sh build --db=postgres

# Финальный образ
FROM quay.io/keycloak/keycloak:24.0.1
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Дополнительные настройки
ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin

# Используем не-root пользователя
USER 1000

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized"]