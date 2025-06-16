# Используем базовый образ с полной поддержкой пакетного менеджера
FROM eclipse-temurin:17-jdk-jammy as builder

# Установка Keycloak
ARG KEYCLOAK_VERSION=24.0.1
RUN apt-get update && \
    apt-get install -y wget unzip && \
    wget https://github.com/keycloak/keycloak/releases/download/$KEYCLOAK_VERSION/keycloak-$KEYCLOAK_VERSION.zip && \
    unzip keycloak-$KEYCLOAK_VERSION.zip && \
    mv keycloak-$KEYCLOAK_VERSION /opt/keycloak && \
    rm keycloak-$KEYCLOAK_VERSION.zip && \
    apt-get remove -y wget unzip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Установка драйвера PostgreSQL
RUN wget -O /opt/keycloak/providers/postgresql.jar \
    https://jdbc.postgresql.org/download/postgresql-42.7.3.jar

# Предварительная сборка с PostgreSQL
WORKDIR /opt/keycloak
RUN bin/kc.sh build --db=postgres

# Финальный образ
FROM eclipse-temurin:17-jre-jammy
COPY --from=builder /opt/keycloak /opt/keycloak

# Настройки Keycloak
ENV KEYCLOAK_ADMIN=admin
ENV KEYCLOAK_ADMIN_PASSWORD=admin
WORKDIR /opt/keycloak

# Используем не-root пользователя
RUN groupadd -g 1000 keycloak && \
    useradd -u 1000 -g 1000 keycloak && \
    chown -R keycloak:keycloak /opt/keycloak
USER keycloak

EXPOSE 8080
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized"]