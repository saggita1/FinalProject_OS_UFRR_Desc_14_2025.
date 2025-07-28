const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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

    res.json({
        cpu: calcularUsoCpu().toFixed(2),
        memoria: usoMemoria.toFixed(2),
        conexoes: totalConexoes
    });
});

// 🔹 Conexões Socket.IO (ataques)
io.on("connection", (socket) => {
    console.log("Nova conexão: ", socket.id);

    socket.on("ataque", () => {
        console.log("Ataque recebido de", socket.id);
        // Aqui você pode simular processamento pesado
    });

    socket.on("disconnect", () => {
        console.log("Conexão encerrada: ", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
