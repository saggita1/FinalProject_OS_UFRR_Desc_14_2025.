const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");

const URL_STATS = "http://localhost:3000/stats";
const URL_FIREWALL_ON = "http://localhost:3000/mitigacao/ativar";
const URL_FIREWALL_OFF = "http://localhost:3000/mitigacao/desativar";
const RESULTADO_ARQUIVO = "resultados_teste.json";

async function coletarMetrica() {
    const res = await axios.get(URL_STATS);
    return {
        timestamp: Date.now(),
        cpu: res.data.cpu,
        memoria: res.data.memoria,
        conexoes: res.data.conexoes,
        bloqueados: res.data.bloqueados.length
    };
}

function rodarAtaque(callback) {
    console.log("🚀 Iniciando ataque ApacheBench...");
    exec("ab -n 2000 -c 100 http://localhost:3000/stats", async (error, stdout) => {
        if (error) console.error("Erro no ataque:", error);
        else console.log("📄 Resultado ApacheBench:\n", stdout);

        const metricaFinal = await coletarMetrica();

        callback({
            resultado: stdout,
            metricaFinal
        });
    });
}

(async () => {
    const resultados = [];

    // 1️⃣ Sem mitigação
    console.log("⚠️ Desativando mitigação...");
    await axios.post(URL_FIREWALL_OFF);
    await new Promise(resolve => {
        rodarAtaque((res) => {
            resultados.push({ mitigacao: false, ...res });
            resolve();
        });
    });

    // 2️⃣ Com mitigação
    console.log("🛡️ Ativando mitigação...");
    await axios.post(URL_FIREWALL_ON);
    await new Promise(resolve => {
        rodarAtaque((res) => {
            resultados.push({ mitigacao: true, ...res });
            resolve();
        });
    });

    fs.writeFileSync(RESULTADO_ARQUIVO, JSON.stringify(resultados, null, 2));
    console.log("✅ Testes concluídos. Resultados salvos em", RESULTADO_ARQUIVO);
})();
