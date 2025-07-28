const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Cache para contar requisições por IP
const requisicoesPorIp = new Map();

// Lista de IPs bloqueados com tempo de banimento
const ipsBloqueados = new Map();

// Configurações de mitigação
const LIMITE_REQ_POR_SEGUNDO = 20;  // máximo de requisições permitidas
const TEMPO_BAN_MS = 10000;         // 10 segundos de bloqueio

function firewall(req, res, next) {
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

// 🔹 Usar middleware antes das rotas
app.use(firewall);

// Serve a pasta cliente
app.use(express.static("cliente"));

// 🔹 Variável global para cálculo da CPU
let ultimaMedidaCpu = os.cpus();

// 🔹 Função para calcular uso da CPU em tempo real
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

// 🔹 Endpoint de métricas
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


// 🔹 Conexões Socket.IO (ataques)
io.on("connection", (socket) => {
    const ip = socket.handshake.address;

    console.log("Nova conexão:", ip, socket.id);

    socket.on("ataque", () => {
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
