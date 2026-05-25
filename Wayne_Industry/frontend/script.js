class WayneApp {
    constructor() {
        this.currentUser = null;
        this.token = localStorage.getItem('token');
        this.init();
    }


    async fetchWithTimeout(url, options = {}, timeout = 10000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
            const res = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(id);
            return res;
        } catch (err) {
            clearTimeout(id);
            throw new Error(err.name === 'AbortError' ? 'Timeout na requisição' : err.message);
        }
    }


    async request(method, url, body = null, auth = true) {
        const headers = { 'Content-Type': 'application/json' };
        if (auth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);
        const res = await this.fetchWithTimeout(url, options);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || `Erro HTTP ${res.status}`);
        return data;
    }


    async init() {
        if (this.token) {
            try {
                this.currentUser = await this.request('GET', '/auth/me', null, true);
                this.showDashboard();
            } catch (error) {
                console.warn('Token inválido ou expirado', error);
                this.logout();
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    }

    // Tela de login e cadastro
    showLogin() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="login-container" style="max-width:400px; margin:50px auto;">
                <h2>LOGIN</h2>
                <input type="email" id="loginEmail" placeholder="Email">
                <input type="password" id="loginSenha" placeholder="Senha">
                <button id="btnLogin">Entrar</button>
                <hr>
                <h2>CADASTRO</h2>
                <input type="text" id="regNome" placeholder="Nome completo">
                <input type="email" id="regEmail" placeholder="Email">
                <input type="password" id="regSenha" placeholder="Senha">
                <button id="btnRegistrar">Cadastrar</button>
                <div id="msg" class="message"></div>
            </div>
        `;
        document.getElementById('btnLogin').onclick = () => this.login();
        document.getElementById('btnRegistrar').onclick = () => this.register();
    }

    showMsg(msg, color) {
        const div = document.getElementById('msg');
        if (div) {
            div.innerText = msg;
            div.style.color = color;
            setTimeout(() => div.innerText = '', 4000);
        }
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const senha = document.getElementById('loginSenha').value;
        if (!email || !senha) return this.showMsg('Preencha email e senha', 'red');
        try {
            const data = await this.request('POST', '/auth/login', { email, senha }, false);
            this.token = data.access_token;
            localStorage.setItem('token', this.token);
            this.currentUser = data.usuario;
            this.showDashboard();
        } catch (err) {
            this.showMsg(err.message, 'red');
        }
    }

    async register() {
        const nome = document.getElementById('regNome').value;
        const email = document.getElementById('regEmail').value;
        const senha = document.getElementById('regSenha').value;
        if (!nome || !email || !senha) return this.showMsg('Preencha todos os campos', 'red');
        try {
            await this.request('POST', '/auth/registrar', { nome, email, senha }, false);
            this.showMsg('Cadastro realizado! Faça login.', 'green');
            document.getElementById('regNome').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regSenha').value = '';
        } catch (err) {
            this.showMsg(err.message, 'red');
        }
    }

    async showDashboard() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="dashboard">
                <div class="header">
                    <h1>INDUSTRIAS WAYNE</h1>
                    <p>Bem-vindo, <strong>${this.escapeHtml(this.currentUser.nome)}</strong> (${this.currentUser.tipo})</p>
                    <button id="logoutBtn" class="secondary">SAIR</button>
                </div>
                <hr>
                <h2>RECURSOS DISPONIVEIS</h2>
                <div id="listaRecursos"><div class="loading">Carregando...</div></div>

                ${this.currentUser.tipo === 'admin' ? `
                    <hr>
                    <div class="admin-panel">
                        <h3>PAINEL ADMINISTRADOR</h3>
                        <form id="formCriarRecurso">
                            <input type="text" id="nomeRecurso" placeholder="Nome do recurso" required>
                            <input type="text" id="tipoRecurso" placeholder="Tipo (equipamento/veiculo/dispositivo_seguranca)" required>
                            <input type="number" id="quantidadeTotal" placeholder="Quantidade total" value="1">
                            <button type="submit">CRIAR RECURSO</button>
                        </form>
                        <div id="adminMsg" class="message"></div>
                    </div>
                ` : ''}

                <hr>
                <div class="access-checker">
                    <h3>VERIFICAR ACESSO A AREA</h3>
                    <input type="text" id="areaName" placeholder="Area (recepcao, escritorios, laboratorio, batcaverna)">
                    <button id="checkAccessBtn">VERIFICAR PERMISSAO</button>
                    <div id="accessResult" class="access-result"></div>
                </div>
            </div>
        `;

        document.getElementById('logoutBtn').onclick = () => this.logout();
        document.getElementById('checkAccessBtn').onclick = () => this.verificarAcesso();

        if (this.currentUser.tipo === 'admin') {
            const form = document.getElementById('formCriarRecurso');
            form.onsubmit = (e) => {
                e.preventDefault();
                this.criarRecurso();
            };
        }

        await this.carregarRecursos();
        await this.carregarDashboardStats(); 
        if (this.currentUser.tipo === 'admin') {
            await this.carregarUsuarios();
        }
    }

    // CARREGAR RECURSOS
    async carregarRecursos() {
        const container = document.getElementById('listaRecursos');
        if (!container) return;
        try {
            const recursos = await this.request('GET', '/recursos/listar');
            if (recursos.length === 0) {
                container.innerHTML = '<p>Nenhum recurso cadastrado.</p>';
                return;
            }
            container.innerHTML = recursos.map(r => `
                <div class="resource-card">
                    <strong>${this.escapeHtml(r.nome)}</strong> (${this.escapeHtml(r.tipo)})<br>
                    Quantidade total: ${r.quantidade_total}<br>
                    ${this.currentUser.tipo === 'admin' ? `
                        <button data-editar="${r.id}">Editar</button>
                        <button data-remover="${r.id}" class="danger">Remover</button>
                    ` : ''}
                </div>
            `).join('');
            if (this.currentUser.tipo === 'admin') {
                document.querySelectorAll('[data-editar]').forEach(btn => {
                    btn.onclick = () => this.editarRecurso(parseInt(btn.dataset.editar));
                });
                document.querySelectorAll('[data-remover]').forEach(btn => {
                    btn.onclick = () => this.removerRecurso(parseInt(btn.dataset.remover));
                });
            }
        } catch (err) {
            container.innerHTML = '<p class="error">Erro ao carregar recursos.</p>';
            console.error(err);
        }
    }

    // CRUD recursos
    async criarRecurso() {
        const nome = document.getElementById('nomeRecurso').value;
        const tipo = document.getElementById('tipoRecurso').value;
        const quantidade_total = parseInt(document.getElementById('quantidadeTotal').value);
        try {
            await this.request('POST', '/recursos/admin/criar', { nome, tipo, quantidade_total });
            const adminMsg = document.getElementById('adminMsg');
            if (adminMsg) adminMsg.innerText = 'Recurso criado com sucesso!';
            document.getElementById('formCriarRecurso').reset();
            await this.carregarRecursos();
        } catch (err) {
            const adminMsg = document.getElementById('adminMsg');
            if (adminMsg) adminMsg.innerText = err.message;
        }
    }

    async editarRecurso(id) {
        const novoNome = prompt('Digite o novo nome do recurso:');
        if (!novoNome) return;
        try {
            await this.request('PUT', `/recursos/admin/atualizar/${id}`, { nome: novoNome });
            await this.carregarRecursos();
        } catch (err) {
            alert(err.message);
        }
    }

    async removerRecurso(id) {
        if (!confirm('Tem certeza que deseja remover permanentemente este recurso?')) return;
        try {
            await this.request('DELETE', `/recursos/admin/remover/${id}`);
            await this.carregarRecursos();
        } catch (err) {
            alert(err.message);
        }
    }

    // CARREGAR USUÁRIOS
    async carregarUsuarios() {
        if (this.currentUser.tipo !== 'admin') return;
        try {
            const usuarios = await this.request('GET', '/auth/usuarios');
            const oldPanel = document.querySelector('.user-panel');
            if (oldPanel) oldPanel.remove();
            const container = document.createElement('div');
            container.className = 'user-panel';
            container.innerHTML = `<h3>GERENCIAR USUÁRIOS</h3><div id="listaUsuarios"></div>`;
            const listaDiv = container.querySelector('#listaUsuarios');
            usuarios.forEach(u => {
                const div = document.createElement('div');
                div.className = 'user-card';
                div.innerHTML = `
                    <strong>${this.escapeHtml(u.nome)}</strong> (${u.email}) - Tipo: ${u.tipo}
                    <br>
                    <button data-id="${u.id}" data-tipo="gerente" class="promote-btn">Promover a Gerente</button>
                    <button data-id="${u.id}" data-tipo="admin" class="promote-btn">Promover a Admin</button>
                `;
                listaDiv.appendChild(div);
            });
            const adminPanel = document.querySelector('.admin-panel');
            if (adminPanel) {
                adminPanel.insertAdjacentElement('afterend', container);
            } else {
                document.querySelector('.dashboard').appendChild(container);
            }
            document.querySelectorAll('.promote-btn').forEach(btn => {
                btn.onclick = () => this.promoverUsuario(parseInt(btn.dataset.id), btn.dataset.tipo);
            });
        } catch (err) {
            console.error('Erro ao carregar usuários:', err);
        }
    }

    async promoverUsuario(id, novoTipo) {
        try {
            await this.request('PUT', `/auth/promover/${id}`, { novo_tipo: novoTipo });
            alert('Usuário promovido com sucesso!');
            await this.carregarUsuarios();
        } catch (err) {
            alert(`Erro ao promover: ${err.message}`);
        }
    }


    async verificarAcesso() {
        const area = document.getElementById('areaName').value.trim().toLowerCase();
        const resultDiv = document.getElementById('accessResult');
        if (!area) {
            resultDiv.innerHTML = '<span style="color:orange;">Digite o nome da area.</span>';
            return;
        }
        try {
            const data = await this.request('POST', '/acesso/verificar', { area });
            if (data.acesso) {
                resultDiv.innerHTML = `<span style="color:#0f0;">ACESSO LIBERADO: ${data.mensagem}</span>`;
            } else {
                resultDiv.innerHTML = `<span style="color:#f44;">ACESSO NEGADO: ${data.motivo}</span>`;
            }
        } catch (err) {
            resultDiv.innerHTML = `<span style="color:red;">Erro: ${err.message}</span>`;
        }
    }

    //DASHBOARD ESTATÍSTICO
    async carregarDashboardStats() {

        try {
            const userStats = await this.request('GET', '/auth/stats');
            const resourceStats = await this.request('GET', '/recursos/stats');

            let dashboardSection = document.querySelector('.dashboard-stats');
            if (!dashboardSection) {
                dashboardSection = document.createElement('div');
                dashboardSection.className = 'dashboard-stats';
                const accessChecker = document.querySelector('.access-checker');
                if (accessChecker) {
                    accessChecker.insertAdjacentElement('beforebegin', dashboardSection);
                } else {
                    document.querySelector('.dashboard').appendChild(dashboardSection);
                }
            }

            dashboardSection.innerHTML = `
                <h2>PAINEL DE CONTROLE</h2>
                <div class="stats-cards">
                    <div class="card">Total de Usuários: ${userStats.total}</div>
                    <div class="card">Total de Recursos: ${resourceStats.total}</div>
                </div>
                <div class="charts-container">
                    <div class="chart-box">
                        <canvas id="userChart" width="400" height="300"></canvas>
                    </div>
                    <div class="chart-box">
                        <canvas id="resourceChart" width="400" height="300"></canvas>
                    </div>
                </div>
            `;

// Gráfico de usuários (pizza)
            const userCtx = document.getElementById('userChart').getContext('2d');
            new Chart(userCtx, {
                type: 'pie',
                data: {
                    labels: ['Admin', 'Gerente', 'Funcionário'],
                    datasets: [{
                        data: [userStats.admin, userStats.gerente, userStats.funcionario],
                        backgroundColor: ['#ff4444', '#44ff44', '#4444ff'],
                        borderColor: 'white',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'top' },
                        title: { display: true, text: 'Usuários por Tipo' }
                    }
                }
            });

// Gráfico de recursos (barras)
            const resCtx = document.getElementById('resourceChart').getContext('2d');
            new Chart(resCtx, {
                type: 'bar',
                data: {
                    labels: ['Equipamento', 'Veículo', 'Dispositivo Segurança'],
                    datasets: [{
                        label: 'Quantidade',
                        data: [resourceStats.equipamento, resourceStats.veiculo, resourceStats.dispositivo_seguranca],
                        backgroundColor: '#00aaff',
                        borderColor: '#00ffff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Recursos por Tipo' }
                    },
                    scales: {
                        y: { beginAtZero: true, stepSize: 1 }
                    }
                }
            });
        } catch (err) {
            console.error('Erro ao carregar estatísticas do dashboard:', err);
        }
    }

    logout() {
        localStorage.removeItem('token');
        this.token = null;
        this.currentUser = null;
        this.showLogin();
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
}

// Inicializa a aplicação
document.addEventListener('DOMContentLoaded', () => {
    new WayneApp();
});


