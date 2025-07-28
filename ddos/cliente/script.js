const socket = io();

// Gráficos
const ctxCpu = document.getElementById("cpuChart").getContext("2d");
const ctxRam = document.getElementById("ramChart").getContext("2d");
const ctxConn = document.getElementById("connChart").getContext("2d");

const criarGrafico = (ctx, label, cor) => new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: label,
            borderColor: cor,
            data: [],
            fill: false
        }]
    },
    options: {
        animation: false,
        scales: {
            x: { display: false },
            y: { min: 0, max: 100 }
        }
    }
});

const cpuChart = criarGrafico(ctxCpu, "Uso de CPU (%)", "red");
const ramChart = criarGrafico(ctxRam, "Uso de RAM (%)", "blue");
const connChart = criarGrafico(ctxConn, "Conexões Ativas", "green");

// atualiza os graficos a cada 1s
setInterval(() => {
    fetch("/stats")
        .then(res => res.json())
        .then(data => {
            const now = new Date().toLocaleTimeString();

            // atualiza CPU
            cpuChart.data.labels.push(now);
            cpuChart.data.datasets[0].data.push(data.cpu);
            if (cpuChart.data.labels.length > 20) {
                cpuChart.data.labels.shift();
                cpuChart.data.datasets[0].data.shift();
            }
            cpuChart.update();

            // RAM
            ramChart.data.labels.push(now);
            ramChart.data.datasets[0].data.push(data.memoria);
            if (ramChart.data.labels.length > 20) {
                ramChart.data.labels.shift();
                ramChart.data.datasets[0].data.shift();
            }
            ramChart.update();

            // conexões
            connChart.data.labels.push(now);
            connChart.data.datasets[0].data.push(data.conexoes);
            if (connChart.data.labels.length > 20) {
                connChart.data.labels.shift();
                connChart.data.datasets[0].data.shift();
            }
            connChart.update();
        });
}, 1000);
