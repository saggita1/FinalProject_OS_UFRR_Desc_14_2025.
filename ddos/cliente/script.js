const socket = io();

function iniciarAtaque() {
    setInterval(() => {
        socket.emit("ataque");
    }, 10); // 100 requisições por segundo aprox.
}
