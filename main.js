const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox'
    ]
  }
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.initialize();

const sessions = {};
const steps = {
  1: "Digite o local de origem",
  2: "Digite o local de destino",
  3: "Digite a quilometragem total",
  4: "Digite a quilometragem adicional"
};

const fields = ["localOrigem", "localDestino", "kmTotal", "kmAdicional"];

client.on('message', async (msg) => {
  const chatId = msg.from;

  if (msg.body.toLowerCase().match(/atendimento/i)) {
    const data = extractInfo(msg.body);

    sessions[chatId] = {
      protocolo: data.protocolo,
      data: data.data,
      placa: data.placa,
      modelo: data.modelo,
      step: 1
    };

    client.sendMessage(
      chatId,
      `*Número do protocolo:* ${data.protocolo}
📅 *Data:* ${data.data}
🪧 *Placa:* ${data.placa}
🚙 *Modelo:* ${data.modelo}`
    );

    client.sendMessage(chatId, steps[1]);
    return;
  }

  if (!sessions[chatId]) return;

  const userSession = sessions[chatId];

  if (userSession.step <= fields.length) {
    userSession[fields[userSession.step - 1]] = msg.body;
    userSession.step++;

    if (steps[userSession.step]) {
      client.sendMessage(chatId, steps[userSession.step]);
      return;
    }
  }

  client.sendMessage(
    chatId,
    `*Resumo da solicitação:*
🔹 *Número do protocolo:* ${userSession.protocolo}
📅 *Data:* ${userSession.data}
🚗 *Placa:* ${userSession.placa}
🚙 *Modelo:* ${userSession.modelo}
📍 *Origem:* ${userSession.localOrigem}
📍 *Destino:* ${userSession.localDestino}
📏 *Quilometragem Total:* ${userSession.kmTotal}
📏 *Quilometragem Adicional:* ${userSession.kmAdicional}`
  );

  await sendToApi(userSession);
  client.sendMessage(chatId, `Acionamento registrado: 
    https://service-agreement.vercel.app/service-list/${extractMonth(userSession.data, true)}`)

  delete sessions[chatId];
});

const extractMonth = (date, resetDay) => {
  const separatedDate = date.split('/');

  if (resetDay)
    return `${separatedDate[2]}-${separatedDate[1]}-01T03:00:00.000Z`;

  return `${separatedDate[2]}-${separatedDate[1]}-${separatedDate[0]}T03:00:00.000Z`;
}

const sendToApi = async (data) => {
  const service = {
    month: extractMonth(data.data, true),
    newService: {
      numeroProtocolo: data.protocolo,
      tipoAcionamento: 1,
      data: extractMonth(data.data, false),
      origem: data.localOrigem,
      destino: data.localDestino,
      modeloVeiculo: data.modelo,
      placaVeiculo: data.placa,
      kmTotal: data.kmTotal,
      kmAdicional: data.kmAdicional,
      valorNormal: 165,
      valorTotal: 165 + (data.kmAdicional * 3.3)
    }
  }

  await fetch("http://localhost:3000/api/save-service", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(service),
  });
}

const extractInfo = (text) => {
  const protocoloMatch = text.match(/Protocolo:\s*(\d+)/);
  const dataMatch = text.match(/Data\/Hora:\s*(\d{2}\/\d{2}\/\d{4})/);
  const placaMatch = text.match(/Veículo:\s*([\w\d]+)-/);
  const modeloMatch = text.match(/Veículo:\s*[\w\d]+-(.+)/);
  const bairroOrigemMatch = text.match(/Bairro\s*:\s*([\w\s]+)/);
  const bairroDestinoMatch = text.match(/Bairro\s*:\s*([\w\s]+)$/m);

  return {
    protocolo: protocoloMatch ? protocoloMatch[1] : null,
    data: dataMatch ? dataMatch[1] : null,
    placa: placaMatch ? placaMatch[1] : null,
    modelo: modeloMatch ? modeloMatch[1].trim() : null,
    bairroOrigem: bairroOrigemMatch ? bairroOrigemMatch[1].trim() : null,
    bairroDestino: bairroDestinoMatch ? bairroDestinoMatch[1].trim() : null
  };
}