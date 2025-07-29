const { exec } = require("child_process");
const fs = require("fs");
const axios = require("axios");

const URL_STATS = "http://localhost:3000/stats";
const URL_FIREWALL_ON = "http://localhost:3000/mitigacao/ativar";
const URL_FIREWALL_OFF = "http://localhost:3000/mitigacao/desativar";
const URL_ATAQUE = "http://localhost:3000/ataque";
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

function extrairFalhas(abOutput) {
    const match = abOutput.match(/Failed requests:\s+(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function rodarAtaque(callback) {
    console.log("🚀 Iniciando ataque ApacheBench...");
    exec(`ab -n 2000 -c 100 ${URL_ATAQUE}`, async (error, stdout) => {
        if (error) console.error("Erro no ataque:", error);
        else console.log("📄 Resultado ApacheBench:\n", stdout);

        const falhas = extrairFalhas(stdout);
        const sucesso = 2000 - falhas;
        const taxaBloqueio = ((falhas / 2000) * 100).toFixed(2);

        const metricaFinal = await coletarMetrica();

        callback({
            resultado: stdout,
            falhas,
            sucesso,
            taxaBloqueio,
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
