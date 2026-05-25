from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Usuario(Base):
    __tablename__ = 'usuarios'

    id =Column(Integer, primary_key=True, index=True)
    nome =Column(String(100), nullable=False)
    email =Column(String(100), unique=True, nullable=False, index=True)
    senha =Column(String(200), nullable=False)
    tipo =Column(String(20), default='funcionario') # funcionario, gerente, admin

class Recurso(Base):
    __tablename__ = 'recursos'

    id =Column(Integer, primary_key=True, index=True)
    nome =Column(String(100), nullable=False)
    tipo = Column(String(50), nullable=False)   # equipamento, veiculo, dispositivo_seguranca
    quantidade_total =Column(Integer, default=1)


from db import engine
Base.metadata.create_all(bind=engine)


from db import SessionLocal
from models import Usuario
import bcrypt

db = SessionLocal()
admin = db.query(Usuario).filter(Usuario.email == "admin@wayne.com").first()
if not admin:
    senha_hash = bcrypt.hashpw("admin123".encode()[:72], bcrypt.gensalt()).decode()
    admin = Usuario(
        nome="Administrador",
        email="admin@wayne.com",
        senha=senha_hash,
        tipo="admin"
    )
    db.add(admin)
    db.commit()
    print("Admin criado: admin@wayne.com / admin123")