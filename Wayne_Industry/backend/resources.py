from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel  # <-- importe o Pydantic

from db import get_db
from models import Recurso
from auth_routes import get_current_user, require_admin

router = APIRouter(prefix="/recursos", tags=["recursos"])

# Modelos Pydantic para validação
class RecursoCreate(BaseModel):
    nome: str
    tipo: str
    quantidade_total: int = 1

class RecursoUpdate(BaseModel):
    nome: Optional[str] = None
    quantidade_total: Optional[int] = None

# ADMIN: Criar recurso (agora aceita JSON)
@router.post("/admin/criar")
def criar_recurso(
    recurso_data: RecursoCreate,
    admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    recurso = Recurso(
        nome=recurso_data.nome,
        tipo=recurso_data.tipo,
        quantidade_total=recurso_data.quantidade_total
    )
    db.add(recurso)
    db.commit()
    db.refresh(recurso)
    return {"msg": "Recurso criado", "id": recurso.id}

# ADMIN: Atualizar recurso 
@router.put("/admin/atualizar/{recurso_id}")
def atualizar_recurso(
    recurso_id: int,
    recurso_data: RecursoUpdate,
    admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    recurso = db.query(Recurso).filter(Recurso.id == recurso_id).first()
    if not recurso:
        raise HTTPException(404, "Recurso não encontrado")
    if recurso_data.nome is not None:
        recurso.nome = recurso_data.nome
    if recurso_data.quantidade_total is not None:
        recurso.quantidade_total = recurso_data.quantidade_total
    db.commit()
    return {"msg": "Recurso atualizado"}

# ADMIN: Remover recurso
@router.delete("/admin/remover/{recurso_id}")
def remover_recurso(
    recurso_id: int,
    admin = Depends(require_admin),
    db: Session = Depends(get_db)
):
    recurso = db.query(Recurso).filter(Recurso.id == recurso_id).first()
    if not recurso:
        raise HTTPException(404, "Recurso não encontrado")
    db.delete(recurso)
    db.commit()
    return {"msg": "Recurso removido"}

# Visualização Itens
@router.get("/listar")
def listar_recursos(
    tipo: Optional[str] = Query(None),
    usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Recurso)
    if tipo:
        query = query.filter(Recurso.tipo == tipo)
    return [
        {
            "id": r.id,
            "nome": r.nome,
            "tipo": r.tipo,
            "quantidade_total": r.quantidade_total,
        }
        for r in query.all()
    ]

@router.get('/stats')
def get_resource_stats(usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    total = db.query(Recurso).count()
    equipamento = db.query(Recurso).filter(Recurso.tipo == 'equipamento').count()
    veiculo = db.query(Recurso).filter(Recurso.tipo == 'veiculo').count()
    dispositivo = db.query(Recurso).filter(Recurso.tipo == 'dispositivo_seguranca').count()
    return {
        "total": total,
        "equipamento": equipamento,
        "veiculo": veiculo,
        "dispositivo_seguranca": dispositivo
    }