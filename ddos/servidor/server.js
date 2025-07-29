const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("cliente"));

// 🔹 Variáveis de mitigação
const requisicoesPorIp = new Map();
const ipsBloqueados = new Map();
const LIMITE_REQ_POR_SEGUNDO = 20;
const TEMPO_BAN_MS = 10000;
let mitigacaoAtiva = true; // 🔥 inicia com firewall ligado

// 🔹 CPU
let ultimaMedidaCpu = os.cpus();
function calcularUsoCpu() {
    const cpusAgora = os.cpus();
    let usoTotal = 0;

    cpusAgora.forEach((cpu, i) => {
        const anterior = ultimaMedidaCpu[i];
        const totalAnterior = Object.values(anterior.times).reduce((acc, tv) => acc + tv, 0);
        const totalAgora = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);

        const idleAnterior = anterior.times.idle;
        const idleAgora = cpu.times.idle;

        const totalDelta = totalAgora - totalAnterior;
        const idleDelta = idleAgora - idleAnterior;

        const uso = ((totalDelta - idleDelta) / totalDelta) * 100;
        usoTotal += uso;
    });

    ultimaMedidaCpu = cpusAgora;
    return usoTotal / cpusAgora.length;
}

// 🔹 Firewall Middleware
function firewall(req, res, next) {
    // Não aplicar firewall na rota de métricas
    if (req.path === "/stats") return next();

    if (!mitigacaoAtiva) return next();

    const ip = req.ip;

    if (ipsBloqueados.has(ip) && Date.now() < ipsBloqueados.get(ip)) {
        return res.status(429).send("IP temporariamente bloqueado");
    }

    const agora = Date.now();
    const historico = requisicoesPorIp.get(ip) || [];
    const novoHistorico = historico.filter(ts => agora - ts < 1000);
    novoHistorico.push(agora);
    requisicoesPorIp.set(ip, novoHistorico);

    if (novoHistorico.length > LIMITE_REQ_POR_SEGUNDO) {
        ipsBloqueados.set(ip, agora + TEMPO_BAN_MS);
        return res.status(429).send("Muitas requisições - IP bloqueado");
    }

    next();
}

app.use(firewall);

// 🔹 Rotas para ativar/desativar mitigação
app.post("/mitigacao/ativar", (req, res) => {
    mitigacaoAtiva = true;
    res.send("Mitigação ativada");
});

app.post("/mitigacao/desativar", (req, res) => {
    mitigacaoAtiva = false;
    res.send("Mitigação desativada");
});

// 🔹 Rota de métricas
app.get("/stats", (req, res) => {
    const memoriaTotal = os.totalmem();
    const memoriaLivre = os.freemem();
    const usoMemoria = ((memoriaTotal - memoriaLivre) / memoriaTotal) * 100;

    const totalConexoes = io.engine.clientsCount;
    const bloqueados = Array.from(ipsBloqueados.keys());

    res.json({
        cpu: calcularUsoCpu().toFixed(2),
        memoria: usoMemoria.toFixed(2),
        conexoes: totalConexoes,
        bloqueados: bloqueados
    });
});

// 🔹 Socket.IO
io.on("connection", (socket) => {
    const ip = socket.handshake.address;

    console.log("Nova conexão:", ip, socket.id);

    socket.on("ataque", () => {
        if (!mitigacaoAtiva) return; // sem mitigação, ignora contagem

        const agora = Date.now();

        if (ipsBloqueados.has(ip) && Date.now() < ipsBloqueados.get(ip)) {
            return; // Ignora ataques de IP bloqueado
        }

        const historico = requisicoesPorIp.get(ip) || [];
        const novoHistorico = historico.filter(ts => agora - ts < 1000);
        novoHistorico.push(agora);
        requisicoesPorIp.set(ip, novoHistorico);

        if (novoHistorico.length > LIMITE_REQ_POR_SEGUNDO) {
            ipsBloqueados.set(ip, agora + TEMPO_BAN_MS);
            console.log(`🚫 IP ${ip} bloqueado por 10s`);
        }
    });

    socket.on("disconnect", () => {
        console.log("Conexão encerrada:", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
