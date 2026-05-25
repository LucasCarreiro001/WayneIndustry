# Indústrias Wayne - Sistema de Controle de Acesso

Sistema full-stack de gerenciamento de acesso e recursos internos inspirado nas Indústrias Wayne.

Desenvolvido com backend em FastAPI e frontend em HTML, CSS e JavaScript, o sistema permite autenticação de usuários, controle de permissões e gerenciamento de recursos corporativos.

---

## Funcionalidades

- Login e cadastro com JWT
- Controle de permissões por cargo
- CRUD de recursos
- Dashboard com gráficos
- Verificação de acesso a áreas restritas
- Interface SPA responsiva

---

## Tecnologias

### Backend
- Python
- FastAPI
- SQLAlchemy
- SQLite
- JWT
- BCrypt
- Pydantic

### Frontend
- HTML5
- CSS3
- JavaScript
- Chart.js

---

## Estrutura do Projeto

```bash
industrias-wayne/
│
├── backend/
│   ├── main.py
│   ├── auth_routes.py
│   ├── resources.py
│   ├── models.py
│   ├── db.py
│   └── seed.py
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
└── README.md
```

---

## Instalação

Clone o repositório:

```bash
git clone https://github.com/LucasCarreiro001/industrias-wayne.git
cd industrias-wayne
```

Crie o ambiente virtual:

```bash
python -m venv venv
```

Ative o ambiente virtual:

### Windows
```bash
venv\Scripts\activate
```

### Linux/Mac
```bash
source venv/bin/activate
```

Instale as dependências:

```bash
pip install fastapi uvicorn sqlalchemy bcrypt python-jose python-dotenv pydantic
```

---

## Configuração

Crie um arquivo `.env` dentro da pasta backend:

```env
SECRET_KEY=sua_chave_secreta
```

---

## Executando o Projeto

Entre na pasta backend:

```bash
cd backend
```

Crie o administrador padrão:

```bash
python seed.py
```

Inicie o servidor:

```bash
uvicorn main:app --reload
```

Acesse:

```txt
http://localhost:8000
```

---

## Login Admin Padrão

```txt
Email: admin@wayne.com
Senha: admin123
```

---

## Principais Rotas

| Método | Endpoint | Descrição |
|---|---|---|
| POST | /auth/registrar | Cadastro |
| POST | /auth/login | Login |
| GET | /auth/me | Usuário logado |
| GET | /recursos/listar | Listar recursos |
| POST | /recursos/admin/criar | Criar recurso |
| POST | /acesso/verificar | Verificar acesso |

---
Lucas Julião Carreiro
Projeto desenvolvido para como projeto final do curso de programação full-stack @infinity school
