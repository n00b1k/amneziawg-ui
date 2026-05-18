#!/usr/bin/env python3
import os
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory, redirect, url_for, flash
from flask_socketio import SocketIO
from flask_login import LoginManager, login_user, login_required, logout_user, current_user

from config import (TEMPLATE_DIR, STATIC_DIR, FLASK_PORT, PRODUCTION, AUTO_START_SERVERS, CERT_FILE, KEY_FILE, APP_VERSION)
from auth import init_db, get_db, verify_password, get_user
from manager import AmneziaManager
from socket_events import register_socket_events
from utils import get_ssl_context, print_config_info
from routes import register_routes
from contextlib import contextmanager
import bcrypt

from logs import setup_logging

app = Flask(__name__,
    template_folder=TEMPLATE_DIR,
    static_folder=STATIC_DIR
)
app.secret_key = os.urandom(24)
logger = setup_logging(app)

# Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.login_message = 'Please login to access this page'

@login_manager.user_loader
def load_user(user_id):
    return get_user(int(user_id))

# SocketIO
socketio = SocketIO(
    app,
    async_mode='threading',
    cors_allowed_origins="*",
    path='/socket.io',
    ping_timeout=10,
    ping_interval=15,
    allow_upgrades=True,
    http_compression=True
)

# Initialize
init_db()
amnezia_manager = AmneziaManager(socketio, logger = logger)
register_socket_events(socketio, amnezia_manager)

# Register routes
register_routes(app, amnezia_manager)

# Маршруты авторизации
@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user, error = verify_password(username, password)
        
        if user:
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('index'))
        else:
            flash(error or 'Invalid username or password', 'error')
    
    return render_template('login.html', version=APP_VERSION)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

@app.route('/api/defaults')
@login_required
def get_defaults():
    from config import DEFAULT_MTU, DEFAULT_SUBNET, DEFAULT_PORT, DEFAULT_DNS
    return jsonify({
        "mtu": DEFAULT_MTU,
        "subnet": DEFAULT_SUBNET,
        "port": DEFAULT_PORT,
        "dns": DEFAULT_DNS
    })

@app.route('/')
@login_required
def index():
    return render_template('index.html', current_user=current_user, version=APP_VERSION)

@app.route('/static/<path:filename>')
@login_required
def static_files(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route('/create-server')
@login_required
def create_server_page():
    print(f"Template folder: {app.template_folder}")
    print(f"Files: {os.listdir(app.template_folder)}")
    return render_template('create_server.html', version=APP_VERSION)


@app.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        print(f"Template folder: {app.template_folder}")
        print(f"Files: {os.listdir(app.template_folder)}")
        
        # Проверка длины нового пароля
        if len(new_password) < 8:
            flash('New password must be at least 8 characters long', 'error')
            return render_template('change_password.html', version=APP_VERSION)
        
        # Проверка совпадения паролей
        if new_password != confirm_password:
            flash('New password and confirmation do not match', 'error')
            return render_template('change_password.html', version=APP_VERSION)
        
        # Проверка текущего пароля
        user, error = verify_password(current_user.username, current_password)
        
        if not user:
            flash('Current password is incorrect', 'error')
            return render_template('change_password.html', version=APP_VERSION)
        
        # Хеширование нового пароля
        new_password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Обновление пароля в БД
        with get_db() as db:
            db.execute(
                'UPDATE users SET password_hash = ? WHERE id = ?',
                (new_password_hash, current_user.id)
            )
        
        flash('Password changed successfully! Please login again.', 'success')
        
        # Выход из системы
        logout_user()
        return redirect(url_for('login'))
    
    return render_template('change_password.html', version=APP_VERSION)

if __name__ == '__main__':
    print_config_info()
    cert_file, key_file = get_ssl_context(CERT_FILE, KEY_FILE)
    
    if PRODUCTION:
        from waitress import serve
        serve(app, host='0.0.0.0', port=FLASK_PORT, threads=4)
    else:
        app.run(host='0.0.0.0', port=FLASK_PORT, ssl_context=(cert_file, key_file), debug=False, threaded=True)