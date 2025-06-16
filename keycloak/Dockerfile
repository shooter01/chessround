# keycloak/Dockerfile

# ——————— Этап сборки ———————
FROM quay.io/keycloak/keycloak:23.0.6 AS builder

# Указываем параметры сборки
ARG KC_DB_URL=jdbc:postgresql://postgres-service.default.svc.cluster.local:5432/keycloak
ENV KC_DB=postgres \
    KC_DB_URL=${KC_DB_URL} \
    KC_DB_USERNAME=keycloak \
    KC_DB_PASSWORD=password \
    KC_HTTP_RELATIVE_PATH=/auth

# Собираем оптимизированный сервер с контекстным путём /auth
RUN /opt/keycloak/bin/kc.sh build \
    --db=postgres \
    --http-relative-path=/auth

# ——————— Финальный образ ———————
FROM quay.io/keycloak/keycloak:23.0.6

# Копируем всё из builder, включая “собранные” слои
COPY --from=builder /opt/keycloak /opt/keycloak

# Админские креды
ENV KEYCLOAK_ADMIN=admin \
    KEYCLOAK_ADMIN_PASSWORD=admin

# Прокси и хосты (Istio → X-Forwarded-*)
ENV KC_PROXY=edge \
    KC_HOSTNAME=dofrag.com \
    KC_HOSTNAME_STRICT=false \
    KC_HOSTNAME_STRICT_BACKCHANNEL=false \
    KC_HTTP_ENABLED=true

# Порт по умолчанию 8080
EXPOSE 8080

# Запускаем оптимизированный продакшен-сервер
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized"]
