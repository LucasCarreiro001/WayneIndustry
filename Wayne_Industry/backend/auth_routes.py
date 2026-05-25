from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import bcrypt
from jose import JWTError, jwt
import os
from dotenv import load_dotenv
from pydantic import BaseModel 

from db import get_db
from models import Usuario

class LoginRequest(BaseModel):
    email: str
    senha: str

class RegistrarRequest(BaseModel):
    nome: str
    email: str
    senha: str

class PromoverRequest(BaseModel):
    novo_tipo: str

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY", "12345678910")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

router = APIRouter(prefix='/auth', tags=['autenticação'])
security = HTTPBearer()

# DEPENDÊNCIAS 
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get('sub')
        if email is None:
            raise HTTPException(401, 'Token inválido')
    except JWTError:
        raise HTTPException(401, 'Token inválido ou expirado')
    
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(401, "Usuário não encontrado")
    return usuario

def require_admin(usuario: Usuario = Depends(get_current_user)):
    if getattr(usuario, 'tipo', None) != 'admin':
        raise HTTPException(status.HTTP_403_FORBIDDEN, 'Acesso negado: administrador necessário')
    return usuario

# ROTAS
@router.post('/registrar')
def registrar(dados: RegistrarRequest, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == dados.email).first():
        raise HTTPException(400, 'Email já cadastrado')
    
    senha_bytes = dados.senha.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(senha_bytes, bcrypt.gensalt()).decode("utf-8")
    
    primeiro_usuario = db.query(Usuario).count() == 0
    tipo_usuario = 'admin' if primeiro_usuario else 'funcionario'
    
    usuario = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha=hashed,
        tipo=tipo_usuario
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return {
        "msg": "Usuário criado",
        "id": usuario.id,
        "tipo": usuario.tipo
    }

@router.post('/login')
def login(dados: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if not usuario:
        raise HTTPException(401, 'Email ou senha incorretos')
    
    senha_bytes = dados.senha.encode("utf-8")[:72]
    if not bcrypt.checkpw(senha_bytes, usuario.senha.encode("utf-8")):
        raise HTTPException(401, 'Email ou senha incorretos')
    
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {"sub": usuario.email, "exp": expire}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        'access_token': token,
        'token_type': "bearer",
        'usuario': {'id': usuario.id, 'nome': usuario.nome, 'email': usuario.email, 'tipo': usuario.tipo}
    }

@router.put('/promover/{usuario_id}')
def promover_usuario(
    usuario_id: int,
    dados: PromoverRequest,
    admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    alvo = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not alvo:
        raise HTTPException(404, 'Usuário não encontrado')
    db.query(Usuario).filter(Usuario.id == usuario_id).update({Usuario.tipo: dados.novo_tipo})
    db.commit()
    return {"msg": f"Usuário {alvo.email} agora é {dados.novo_tipo}"}

@router.get('/usuarios')
def listar_usuarios(admin = Depends(require_admin), db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).all()
    return [
        {
            "id": u.id,
            "nome": u.nome,
            "email": u.email,
            "tipo": u.tipo
        }
        for u in usuarios
    ]

@router.get('/stats')
def get_user_stats(usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.query(Usuario).count()
    admin_count = db.query(Usuario).filter(Usuario.tipo == 'admin').count()
    gerente_count = db.query(Usuario).filter(Usuario.tipo == 'gerente').count()
    funcionario_count = db.query(Usuario).filter(Usuario.tipo == 'funcionario').count()
    return {
        "total": total,
        "admin": admin_count,
        "gerente": gerente_count,
        "funcionario": funcionario_count
    }