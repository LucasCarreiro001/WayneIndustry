from fastapi import FastAPI, Depends, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from auth_routes import router as auth_router, get_current_user
from resources import router as resources_router
import os

app = FastAPI()

app.include_router(auth_router)
app.include_router(resources_router)

class AcessoRequest(BaseModel):
    area: str

@app.post("/acesso/verificar")
def verificar_acesso(dados: AcessoRequest, usuario = Depends(get_current_user)):
    permissoes = {
        "recepcao": ["funcionario", "gerente", "admin"],
        "escritorios": ["gerente", "admin"],
        "laboratorio": ["admin"],
        "batcaverna": ["admin"]
    }
    area = dados.area.lower()
    if area not in permissoes:
        raise HTTPException(400, "Área desconhecida")
    if usuario.tipo in permissoes[area]:
        return {"acesso": True, "mensagem": f"Acesso liberado para {area}. Bem-vindo, {usuario.nome}!"}
    else:
        return {"acesso": False, "motivo": f"Seu tipo '{usuario.tipo}' não tem permissão para acessar {area}"}


frontend_dir = os.path.join(os.path.dirname(__file__), "../frontend")
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")