# Dockerfile для Keycloak с предустановленной PostgreSQL поддержкой
FROM quay.io/keycloak/keycloak:24.0.1

# Установка драйвера PostgreSQL и предварительная сборка
USER root
RUN microdnf update -y && \
    microdnf install -y wget && \
    wget -O /opt/keycloak/providers/postgresql.jar \
    https://jdbc.postgresql.org/download/postgresql-42.7.3.jar && \
    chown keycloak:keycloak /opt/keycloak/providers/postgresql.jar && \
    microdnf remove -y wget && \
    microdnf clean all

# Переключаемся обратно на пользователя keycloak
USER keycloak

# Предварительная сборка с PostgreSQL
RUN /opt/keycloak/bin/kc.sh build --db=postgres

# Дополнительные настройки
ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin

# Используем не-root пользователя
USER 1000

ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized"]