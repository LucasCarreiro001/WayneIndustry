#Cria um ADMIN padrão
from db import SessionLocal
from models import Usuario
import bcrypt

def criar_admin():
    db = SessionLocal()
    
    admin = db.query(Usuario).filter_by(email='admin@wayne.com').first()
    if not admin:
        senha = 'admin123'
        senha_hash = bcrypt.hashpw(senha.encode('utf-8')[:72], bcrypt.gensalt()).decode('utf-8')
        
        admin = Usuario(
            nome='Admin Master',
            email='admin@wayne.com',
            senha=senha_hash,
            tipo='admin'
        )
        db.add(admin)
        db.commit()
        print('Administrador criado com sucesso!')
        print('Email: admin@wayne.com')
        print('Senha: admin123')
    else:
        print('Administrador já existe.')
    
    db.close()

if __name__ == "__main__":
    criar_admin()