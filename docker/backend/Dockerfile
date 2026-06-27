# syntax=docker/dockerfile:1.7
# =============================================================================
# Afya HMS — Backend Dockerfile (Laravel 11 / PHP 8.3)
# =============================================================================
# Multi-stage:
#   base    — common toolchain + extensions
#   dev     — local dev with Xdebug, source mount, hot reload
#   prod    — optimized runtime (no dev tools, OPcache, prebuilt composer)
# =============================================================================

ARG PHP_VERSION=8.3
ARG NODE_VERSION=20

# -----------------------------------------------------------------------------
# base: PHP CLI + extensions Laravel needs
# -----------------------------------------------------------------------------
FROM php:${PHP_VERSION}-fpm-alpine AS base

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    COMPOSER_NO_INTERACTION=1 \
    COMPOSER_HOME=/tmp/composer

RUN apk add --no-cache \
        bash \
        git \
        curl \
        wget \
        libpng-dev \
        libzip-dev \
        libxml2-dev \
        oniguruma-dev \
        icu-dev \
        icu-data-full \
        freetype-dev \
        jpeg-dev \
        libwebp-dev \
        openssh-client \
        tzdata \
    && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        gd \
        intl \
        opcache \
        pcntl \
        pdo_mysql \
        zip \
        mbstring \
        xml \
        ctype \
        fileinfo \
        sockets \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps || true

COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

# Configure PHP
RUN { \
        echo 'memory_limit=512M'; \
        echo 'upload_max_filesize=20M'; \
        echo 'post_max_size=20M'; \
        echo 'date.timezone=Africa/Nairobi'; \
        echo 'opcache.enable=1'; \
        echo 'opcache.memory_consumption=256'; \
        echo 'opcache.max_accelerated_files=20000'; \
        echo 'opcache.validate_timestamps=0'; \
        echo 'opcache.revalidate_freq=0'; \
        echo 'expose_php=Off'; \
    } > /usr/local/etc/php/conf.d/afya.ini

WORKDIR /var/www/html

# -----------------------------------------------------------------------------
# dev: source mounted, Xdebug enabled, autoload rebuilt on start
# -----------------------------------------------------------------------------
FROM base AS dev

RUN apk add --no-cache $PHPIZE_DEPS linux-headers \
    && pecl install xdebug \
    && docker-php-ext-enable xdebug \
    && apk del .build-deps

COPY docker/backend/xdebug.ini /usr/local/etc/php/conf.d/xdebug.ini

# Pre-install composer dependencies (cached layer)
COPY backend/composer.json backend/composer.lock* /var/www/html/
RUN composer install --no-scripts --no-autoloader --prefer-dist --no-progress || true

COPY backend /var/www/html

RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R ug+rwX storage bootstrap/cache

EXPOSE 8080
CMD ["php", "-d", "variables_order=EGPCS", "artisan", "serve", "--host=0.0.0.0", "--port=8080"]

# -----------------------------------------------------------------------------
# prod: optimized runtime, no dev dependencies
# -----------------------------------------------------------------------------
FROM base AS prod

ENV APP_ENV=production
ENV COMPOSER_ALLOW_SUPERUSER=1

COPY backend/composer.json backend/composer.lock* /var/www/html/
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --optimize-autoloader --no-progress

COPY backend /var/www/html

RUN composer dump-autoload --optimize --no-dev \
    && php artisan package:discover --ansi || true \
    && mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R ug+rwX storage bootstrap/cache \
    && find /var/www/html -type d -exec chmod 755 {} + \
    && find /var/www/html -type f -exec chmod 644 {} +

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD php artisan app:health-check || exit 1

CMD ["php", "artisan", "octane:start", "--server=frankenphp", "--host=0.0.0.0", "--port=8080"]