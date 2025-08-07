# Simulador de Ataque DDoS com Mecanismos de Mitigação

## Descrição

Sistema educacional para simulação de ataques DDoS (Distributed Denial of Service) com implementação de mecanismos de mitigação em tempo real. Desenvolvido para a disciplina de Sistemas Operacionais da UFRR.

## Autores

- Ryan Pimentel - UFRR
- Leonam Sousa - UFRR

## Funcionalidades

- **Simulação de ataques DDoS**: Interface web para iniciar ataques controlados
- **Monitoramento em tempo real**: Gráficos de CPU, memória RAM e conexões ativas
- **Rate Limiting**: Limitação de requisições por IP (20 req/s)
- **Bloqueio automático**: IPs suspeitos são bloqueados temporariamente (10 segundos)
- **Dashboard visual**: Interface web com gráficos dinâmicos usando Chart.js
- **Testes automatizados**: Scripts para avaliação de eficácia dos mecanismos

## Estrutura do Projeto

```
Projeto/
├── ddos/
│   ├── public/
│   │   ├── index.html          # Interface web principal
│   │   └── script.js           # Scripts frontend e gráficos
│   ├── servidor/
│   │   └── server.js           # Servidor principal com mitigação
│   ├── testes/
│   │   └── avaliacao.js        # Scripts de teste automatizado
│   ├── cliente_bot.js          # Cliente bot para ataques via WebSocket
│   ├── package.json            # Dependências do projeto
│   └── package-lock.json
├── LICENSE
└── README.md
```

## Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript
- **Express.js**: Framework web para Node.js
- **Socket.io**: Comunicação WebSocket em tempo real
- **Chart.js**: Biblioteca para gráficos dinâmicos
- **ApacheBench**: Ferramenta de benchmark para testes de carga

## Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (Node Package Manager)
- ApacheBench (para testes de carga)

### Instalação do ApacheBench

**Ubuntu/Debian:**
```bash
sudo apt-get install apache2-utils
```

**CentOS/RHEL:**
```bash
sudo yum install httpd-tools
```

**macOS:**
```bash
brew install httpd
```

## Instalação

1. Clone o repositório:
```bash
git clone <url-do-repositorio>
cd Projeto/ddos
```

2. Instale as dependências:
```bash
npm install
```

## Uso

### Iniciar o Servidor

```bash
cd servidor
node server.js
```

O servidor será iniciado na porta 3000. Acesse `http://localhost:3000` no navegador.

### Interface Web

A interface principal oferece:

- **Botão "Iniciar ataque"**: Dispara requisições de teste
- **Gráficos em tempo real**:
  - Uso de CPU (%)
  - Uso de RAM (MB)
  - Conexões ativas

### Controle de Mitigação

O sistema de mitigação pode ser controlado via requisições POST:

**Ativar mitigação:**
```bash
curl -X POST http://localhost:3000/mitigacao/ativar
```

**Desativar mitigação:**
```bash
curl -X POST http://localhost:3000/mitigacao/desativar
```

### Testes Automatizados

Execute os testes de avaliação:

```bash
cd testes
node avaliacao.js
```

Os testes comparam o comportamento do sistema com e sem mitigação ativa, gerando o arquivo `resultados_teste.json`.

### Cliente Bot (Ataque via WebSocket)

Para testar ataques via WebSocket:

```bash
node cliente_bot.js
```

O bot enviará requisições contínuas via Socket.io (aproximadamente 100 req/s).

## Métricas Monitoradas

### Métricas do Sistema
- **CPU**: Percentual de uso do processador
- **Memória**: Uso de heap do processo Node.js (MB)
- **Conexões**: Número de conexões WebSocket ativas

### Métricas de Segurança
- **IPs bloqueados**: Lista de endereços IP temporariamente bloqueados
- **Taxa de bloqueio**: Percentual de requisições rejeitadas
- **Requisições por segundo**: Throughput atual do servidor

## Configurações

### Parâmetros de Mitigação

No arquivo `servidor/server.js`:

```javascript
const LIMITE_REQ = 20;          // Requisições por segundo por IP
const BAN_TIME = 10 * 1000;     // Tempo de bloqueio (10 segundos)
const LIMITE_SOCKET = 20;       // Limite para conexões WebSocket
```

### Rotas Disponíveis

- `GET /`: Interface principal
- `GET /ataque`: Endpoint de teste para ataques
- `GET /stats`: API JSON com métricas do sistema
- `POST /mitigacao/ativar`: Ativa proteções DDoS
- `POST /mitigacao/desativar`: Desativa proteções DDoS

## Resultados dos Testes

### Sem Mitigação
- **2000 requisições**: 100% de sucesso
- **Tempo médio**: 63.332ms por requisição
- **Throughput**: 1578.99 req/s
- **CPU final**: 3.24%

### Com Mitigação
- **2000 requisições**: 99% bloqueadas (1980/2000)
- **Tempo médio**: 42.519ms por requisição
- **Throughput**: 2351.87 req/s
- **CPU final**: 20.52%
- **IPs bloqueados**: 1
