const io = require("socket.io-client");
const socket = io("http://localhost:3000");

socket.on("connect", () => {
    console.log(`Bot conectado: ${socket.id}`);

    // Envia requisições em intervalo (ex: 100 vezes por segundo)
    setInterval(() => {
        socket.emit("ataque");
    }, 10); // 10ms = ~100 requisições por segundo
});

socket.on("disconnect", () => {
    console.log(`Bot desconectado: ${socket.id}`);
});
