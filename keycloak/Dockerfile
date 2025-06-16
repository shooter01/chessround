# Dockerfile для Keycloak с предустановленной PostgreSQL поддержкой
FROM quay.io/keycloak/keycloak:24.0.1 as builder

# Установка временных зависимостей (curl)
USER root
RUN microdnf update -y && \
    microdnf install -y curl && \
    microdnf clean all
USER keycloak

# Установка драйвера PostgreSQL
RUN curl -o /opt/keycloak/providers/postgresql.jar \
    https://jdbc.postgresql.org/download/postgresql-42.7.3.jar

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