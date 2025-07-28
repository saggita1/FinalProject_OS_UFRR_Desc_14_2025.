const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("cliente")); // Serve HTML e JS do frontend

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
