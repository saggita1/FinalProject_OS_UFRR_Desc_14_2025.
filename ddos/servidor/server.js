const os = require("os");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("cliente")); // Serve HTML e JS do frontend
app.get("/stats", (req, res) => {
    const memoriaTotal = os.totalmem();
    const memoriaLivre = os.freemem();
    const usoMemoria = ((memoriaTotal - memoriaLivre) / memoriaTotal) * 100;

    const cpus = os.cpus();
    const usoCpu = cpus.map(cpu => {
        const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
        const idle = cpu.times.idle;
        return ((total - idle) / total) * 100;
    });
    const mediaCpu = usoCpu.reduce((a, b) => a + b) / usoCpu.length;

    // Número de conexões Socket.io ativas
    const totalConexoes = io.engine.clientsCount;

    res.json({
        cpu: mediaCpu.toFixed(2),
        memoria: usoMemoria.toFixed(2),
        conexoes: totalConexoes
    });
});


io.on("connection", (socket) => {
    console.log("Nova conexão: ", socket.id);
    socket.on("ataque", () => {
        // Aqui você simula um ataque
        console.log("Ataque recebido de", socket.id);
    });
});

server.listen(3000, () => {
    console.log("Servidor rodando em http://localhost:3000");
});
