const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let mitigacaoAtiva = false;
const limites = new Map();
const bloqueados = new Map();
const LIMITE_REQ = 20; // req/s
const BAN_TIME = 10 * 1000; // 10s

// Para socket
const limiteSockets = new Map();
const bloqueadosSockets = new Map();
const LIMITE_SOCKET = 20;
const BAN_TIME_SOCKET = 10 * 1000;

// Middleware Firewall HTTP
function firewall(req, res, next) {
    const ip = req.ip;

    if (!mitigacaoAtiva) return next();

    if (bloqueados.has(ip)) {
        if (Date.now() - bloqueados.get(ip) > BAN_TIME) {
            bloqueados.delete(ip);
        } else {
            return res.status(429).send("IP bloqueado temporariamente");
        }
    }

    const now = Date.now();
    if (!limites.has(ip)) {
        limites.set(ip, []);
    }
    const timestamps = limites.get(ip);
    timestamps.push(now);

    while (timestamps.length > 0 && now - timestamps[0] > 1000) {
        timestamps.shift();
    }

    if (timestamps.length > LIMITE_REQ) {
        bloqueados.set(ip, Date.now());
        return res.status(429).send("Muitas requisições - bloqueado");
    }

    next();
}

app.use((req, res, next) => {
    const rotasIgnoradas = ["/stats", "/mitigacao/ativar", "/mitigacao/desativar"];
    if (rotasIgnoradas.includes(req.path)) {
        return next();
    }
    firewall(req, res, next);
});

app.use(express.static("public"));

app.get("/ataque", (req, res) => {
    res.send("OK");
});

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

        const uso = totalDelta > 0 ? ((totalDelta - idleDelta) / totalDelta) * 100 : 0;
        usoTotal += uso;
    });

    ultimaMedidaCpu = cpusAgora;
    return usoTotal / cpusAgora.length;
}

app.get("/stats", (req, res) => {
    const memoria = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const cpu = calcularUsoCpu().toFixed(2);
    const conexoes = io.engine.clientsCount;

    res.json({
        cpu,
        memoria,
        conexoes,
        bloqueados: Array.from(bloqueados.keys())
    });
});

app.post("/mitigacao/ativar", (req, res) => {
    mitigacaoAtiva = true;
    res.send("Mitigação ativada");
});

app.post("/mitigacao/desativar", (req, res) => {
    mitigacaoAtiva = false;
    limites.clear();
    bloqueados.clear();
    res.send("Mitigação desativada");
});

io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);

    socket.on("ataque", () => {
        if (!mitigacaoAtiva) {
            console.log(`Ataque recebido do cliente ${socket.id}`);
            return;
        }

        if (bloqueadosSockets.has(socket.id)) {
            if (Date.now() - bloqueadosSockets.get(socket.id) > BAN_TIME_SOCKET) {
                bloqueadosSockets.delete(socket.id);
            } else {
                console.log(`Cliente ${socket.id} bloqueado temporariamente`);
                return;
            }
        }

        const now = Date.now();
        if (!limiteSockets.has(socket.id)) {
            limiteSockets.set(socket.id, []);
        }
        const timestamps = limiteSockets.get(socket.id);
        timestamps.push(now);
        while (timestamps.length > 0 && now - timestamps[0] > 1000) {
            timestamps.shift();
        }

        if (timestamps.length > LIMITE_SOCKET) {
            bloqueadosSockets.set(socket.id, Date.now());
            console.log(`Cliente ${socket.id} bloqueado por excesso de ataques`);
            return;
        }

        console.log(`Ataque recebido do cliente ${socket.id}`);
    });

    socket.on("disconnect", () => {
        console.log("Cliente desconectado:", socket.id);
        limiteSockets.delete(socket.id);
        bloqueadosSockets.delete(socket.id);
    });
});

server.listen(3000, () => console.log("Servidor rodando na porta 3000"));
