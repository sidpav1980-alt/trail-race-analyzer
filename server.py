import os, json, sqlite3
from datetime import datetime, timezone
from pathlib import Path
from flask import Flask, jsonify, request, session, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash

BASE=Path(__file__).resolve().parent
DB=Path(os.environ.get("TRAIL_GAME_DB", BASE/"trail_players.sqlite3"))
MAX_PLAYERS=50
app=Flask(__name__, static_folder=None)
app.secret_key=os.environ.get("SECRET_KEY","CHANGE-ME-IN-PRODUCTION")
app.config.update(SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE="Lax",SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE","0")=="1",MAX_CONTENT_LENGTH=512*1024)

def con():
    c=sqlite3.connect(DB);c.row_factory=sqlite3.Row;c.execute("PRAGMA journal_mode=WAL");return c
def init():
    with con() as c:c.execute("""CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,nick TEXT NOT NULL,nick_key TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,progress_json TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)""")
def now():return datetime.now(timezone.utc).isoformat()
def nick(v):
    x=" ".join(str(v or "").strip().split())
    if not 2<=len(x)<=24:raise ValueError("Ник должен быть от 2 до 24 символов.")
    return x
def password(v):
    x=str(v or "")
    if not 4<=len(x)<=72:raise ValueError("Пароль должен быть от 4 до 72 символов.")
    return x
def user():
    uid=session.get("uid")
    if not uid:return None
    with con() as c:return c.execute("SELECT * FROM users WHERE id=?",(uid,)).fetchone()
def progress(r):
    if not r or not r["progress_json"]:return None
    try:
        x=json.loads(r["progress_json"]);return x if isinstance(x,dict) else None
    except:return None

@app.get("/api/me")
def me():
    r=user()
    if not r:return jsonify(error="not_authenticated"),401
    return jsonify(user={"id":r["id"],"nick":r["nick"]},progress=progress(r))

@app.post("/api/register")
def register():
    d=request.get_json(silent=True) or {}
    try:n=nick(d.get("nick"));p=password(d.get("password"))
    except ValueError as e:return jsonify(error=str(e)),400
    with con() as c:
        if c.execute("SELECT COUNT(*) FROM users").fetchone()[0]>=MAX_PLAYERS:return jsonify(error="Лимит: уже зарегистрировано 50 игроков."),409
        if c.execute("SELECT 1 FROM users WHERE nick_key=?",(n.casefold(),)).fetchone():return jsonify(error="Такой ник уже занят."),409
        t=now();cur=c.execute("INSERT INTO users(nick,nick_key,password_hash,progress_json,created_at,updated_at) VALUES(?,?,?,?,?,?)",(n,n.casefold(),generate_password_hash(p),None,t,t));uid=cur.lastrowid
    session.clear();session["uid"]=uid
    return jsonify(user={"id":uid,"nick":n},progress=None),201

@app.post("/api/login")
def login():
    d=request.get_json(silent=True) or {}
    try:n=nick(d.get("nick"));p=password(d.get("password"))
    except ValueError as e:return jsonify(error=str(e)),400
    with con() as c:r=c.execute("SELECT * FROM users WHERE nick_key=?",(n.casefold(),)).fetchone()
    if not r or not check_password_hash(r["password_hash"],p):return jsonify(error="Неверный ник или пароль."),401
    session.clear();session["uid"]=r["id"]
    return jsonify(user={"id":r["id"],"nick":r["nick"]},progress=progress(r))

@app.post("/api/logout")
def logout():session.clear();return jsonify(ok=True)

@app.put("/api/progress")
def save_progress():
    r=user()
    if not r:return jsonify(error="not_authenticated"),401
    d=request.get_json(silent=True) or {};p=d.get("progress")
    if not isinstance(p,dict):return jsonify(error="Некорректный прогресс."),400
    raw=json.dumps(p,ensure_ascii=False,separators=(",",":"))
    if len(raw.encode())>256*1024:return jsonify(error="Прогресс слишком большой."),413
    with con() as c:c.execute("UPDATE users SET progress_json=?,updated_at=? WHERE id=?",(raw,now(),r["id"]))
    return jsonify(ok=True)

@app.get("/")
def root():return send_from_directory(BASE,"index.html")
@app.get("/<path:path>")
def static(path):
    if path.startswith("api/"):return jsonify(error="not_found"),404
    return send_from_directory(BASE,path)

init()
if __name__=="__main__":
    app.run(host="0.0.0.0",port=int(os.environ.get("PORT","8000")))
