import os
import logging
import time
from logging.handlers import RotatingFileHandler
from flask import Flask, request

def setup_logging(app: Flask):
    """Настраивает логирование Flask в файлы, указанные в config.ALLOWED_LOG_FILES."""
    # Создаём директории для логов, если их нет
    log_dirs = set()
    from config import ALLOWED_LOG_FILES
    for log_cfg in ALLOWED_LOG_FILES:
        log_path = log_cfg["path"]
        dirname = os.path.dirname(log_path)
        if dirname:
            log_dirs.add(dirname)
    for d in log_dirs:
        os.makedirs(d, exist_ok=True)

    # Формат логов
    log_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s: %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    access_formatter = logging.Formatter(
        '%(message)s'
    )

    # 1. Логгер для общих сообщений (app.log)
    app_log_handler = RotatingFileHandler(
        '/var/log/amnezia/app.log', maxBytes=10*1024*1024, backupCount=5
    )
    app_log_handler.setFormatter(log_formatter)
    app_log_handler.setLevel(logging.INFO)
    app.logger.addHandler(app_log_handler)
    app.logger.setLevel(logging.INFO)

    # 2. Логгер для ошибок (error.log) – отдельный хендлер с уровнем ERROR
    error_handler = RotatingFileHandler(
        '/var/log/amnezia/error.log', maxBytes=10*1024*1024, backupCount=5
    )
    error_handler.setFormatter(log_formatter)
    error_handler.setLevel(logging.ERROR)
    app.logger.addHandler(error_handler)

    # 3. Логгер для access-логов (запросы)
    # Создаём отдельный логгер с именем 'access'
    access_logger = logging.getLogger('access')
    access_logger.setLevel(logging.INFO)
    access_handler = RotatingFileHandler(
        '/var/log/amnezia/access.log', maxBytes=10*1024*1024, backupCount=5
    )
    access_handler.setFormatter(access_formatter)
    access_logger.addHandler(access_handler)
    access_logger.propagate = False   # не дублировать в корневой логгер

    # Добавляем обработчик для логирования каждого запроса (после каждого запроса)
    @app.after_request
    def log_request(response):
        # Формат: IP - - [datetime] "METHOD path" status_code content_length
        user = request.remote_addr
        method = request.method
        path = request.full_path
        status = response.status_code
        length = response.content_length or 0
        access_logger.info(f'{user} - - [{time.strftime("%d/%b/%Y:%H:%M:%S %z")}] "{method} {path}" {status} {length}')
        return response

    # Логируем старт приложения
    app.logger.info("Application started")

    app.logger.info("Logging initialized")
    return app.logger