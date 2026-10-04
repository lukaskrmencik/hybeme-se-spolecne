# Production image: PHP-FPM + nginx (serversideup/php), listens on 8080.
# Local development keeps using Sail (compose.yaml).
FROM serversideup/php:8.4-fpm-nginx

ENV PHP_OPCACHE_ENABLE=1 \
    PHP_UPLOAD_MAX_FILE_SIZE=12M \
    PHP_POST_MAX_SIZE=12M \
    # Migrations and caches run from deploy.sh, not on every container start.
    AUTORUN_ENABLED=false

USER root
RUN install-php-extensions intl bcmath
USER www-data

WORKDIR /var/www/html

# Dependencies first, so code changes do not reinstall them.
COPY --chown=www-data:www-data composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress

COPY --chown=www-data:www-data . .
RUN composer dump-autoload --optimize --no-dev --no-scripts \
    && php artisan package:discover --ansi \
    && ln -sfn ../storage/app/public public/storage
