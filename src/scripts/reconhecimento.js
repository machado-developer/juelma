const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("outputCanvas");
const canvasCtx = canvasElement.getContext("2d");
const fraseAtual = document.getElementById("fraseAtual");
const debugDiv = document.getElementById("debug");

let gestosDB = [];
let frase = [];
let gestoAnterior = null;
let podeAdicionar = true;
let toleranciaBase = 0.2;
let historicoScores = [];

function centralizar(landmarks) {
  const centro = landmarks[0];
  return landmarks.map(p => ({
    x: p.x - centro.x,
    y: p.y - centro.y,
    z: p.z - centro.z,
  }));
}

function normalizar(landmarks) {
  const a = landmarks[0];
  const b = landmarks[9];
  const distancia = Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
  ) || 1;
  return landmarks.map(p => ({
    x: p.x / distancia,
    y: p.y / distancia,
    z: p.z / distancia,
  }));
}

function vetor(a, b) {
  return {
    x: b.x - a.x,
    y: b.y - a.y,
    z: b.z - a.z,
  };
}

function calcularAngulo(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
  const cosTheta = dot / (mag1 * mag2);
  return Math.acos(Math.min(Math.max(cosTheta, -1), 1)) * (180 / Math.PI);
}

function extrairAngulos(landmarks) {
  const dedos = {
    indicador: [5, 6, 7, 8],
    medio: [9, 10, 11, 12],
    anelar: [13, 14, 15, 16],
    minimo: [17, 18, 19, 20],
    polegar: [1, 2, 3, 4],
  };

  const angulos = [];

  for (const dedo in dedos) {
    const joints = dedos[dedo];
    for (let i = 0; i < joints.length - 2; i++) {
      const v1 = vetor(landmarks[joints[i]], landmarks[joints[i + 1]]);
      const v2 = vetor(landmarks[joints[i + 1]], landmarks[joints[i + 2]]);
      angulos.push(calcularAngulo(v1, v2));
    }
  }

  return angulos; // em graus
}

function vetorUnificado(landmarks) {
  const centralizados = centralizar(landmarks);
  const normalizados = normalizar(centralizados);
  const posicional = normalizados.flatMap(p => [p.x, p.y, p.z]);
  const angulos = extrairAngulos(normalizados);
  return [...posicional, ...angulos];
}

fetch("http://localhost:4000/gestos")
  .then(res => res.json())
  .then(data => gestosDB = data);

function normalizar(vetor) {
  const norm = Math.sqrt(vetor.reduce((acc, val) => acc + val * val, 0));
  return vetor.map(v => v / norm);
}

function media(lista) {
  return lista.reduce((a, b) => a + b, 0) / lista.length;
}

function reconhecerGesto(mapaMao) {
  const maoEsquerda = mapaMao.Left ? vetorUnificado(mapaMao.Left) : [];
  const maoDireita = mapaMao.Right ? vetorUnificado(mapaMao.Right) : [];

  const vetorAtual = [...maoEsquerda, ...maoDireita];
  const normalizadoAtual = normalizarVetor(vetorAtual);

  let melhorMatch = null;
  let menorDistancia = Infinity;

  for (const gesto of gestosDB) {
    const normalizadoDB = normalizarVetor(gesto.vetor);
    if (
      normalizadoDB.length !== normalizadoAtual.length ||
      normalizadoDB.some(isNaN) ||
      normalizadoAtual.some(isNaN)
    ) {
      continue; // pula este gesto porque é inválido
    }

    const dist = math.distance(normalizadoDB, normalizadoAtual);

    const distNumber = math.isBigNumber(dist) ? dist.toNumber() : dist;

    if (distNumber < menorDistancia) {
      menorDistancia = distNumber;
      melhorMatch = gesto.label;
    }
  }

  historicoScores.push(menorDistancia);
  if (historicoScores.length > 30) historicoScores.shift();

  const toleranciaAdaptada = Math.min(toleranciaBase, media(historicoScores) * 1.2);

  return {
    gesto: menorDistancia < toleranciaAdaptada ? melhorMatch : null,
    score: menorDistancia,
    vetor: vetorAtual
  };
}


function normalizarLandmarks(landmarks) {
  const a = landmarks[0];
  const b = landmarks[9];
  const distancia = Math.sqrt(
    (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2
  ) || 1;

  return landmarks.map(p => ({
    x: p.x / distancia,
    y: p.y / distancia,
    z: p.z / distancia,
  }));
}

function normalizarVetor(vetor) {
  const norm = Math.sqrt(vetor.reduce((acc, val) => acc + val * val, 0)) || 1;
  return vetor.map(v => v / norm);
}

//  Função adaptável (escolhe automaticamente qual normalizar)
function normalizar(dado) {
  if (Array.isArray(dado) && typeof dado[0] === "object" && "x" in dado[0]) {
    return normalizarLandmarks(dado); // é array de pontos com x, y, z
  } else if (Array.isArray(dado) && typeof dado[0] === "number") {
    return normalizarVetor(dado); // é vetor de números
  } else {
    console.warn("Formato de dado não reconhecido para normalização:", dado);
    return dado;
  }
}



function adicionarGestoNaFrase(novo) {
  if (novo && novo !== gestoAnterior && podeAdicionar) {
    frase.push(novo);
    gestoAnterior = novo;
    atualizarFrase();
    console.log(" Gesto reconhecido:", novo);

    const delay = 700 + Math.floor(Math.random() * 300); // delay aleatório para suavizar
    podeAdicionar = false;
    setTimeout(() => podeAdicionar = true, delay);
  }
}

function atualizarFrase() {
  fraseAtual.innerText = "Frase atual: " + (frase.join(" ") || "...");
}

function limparFrase() {
  frase = [];
  gestoAnterior = null;
  atualizarFrase();
}

function falarFrase() {
  const texto = frase.join(" ");
  const msg = new SpeechSynthesisUtterance(texto);
  window.speechSynthesis.speak(msg);
}

function exibirDebug(label, score, pontos) {
  if (!debugDiv) return;

  debugDiv.innerHTML = `
    <b>Gesto:</b> ${label || "-"}<br>
    <b>Score:</b> ${score.toFixed(4)}<br>
    <b>Tolerância:</b> ${toleranciaBase.toFixed(4)}<br>
    <b>Pontos:</b> ${pontos.slice(0, 6).map(n => typeof n === "number" ? n.toFixed(3) : "NaN").join(", ")}<br>
    <b>Vetor:</b> ${pontos.length} dimensões
  `;
}

const hands = new Hands({
  locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 2,
  modelComplexity: 1,
  minDetectionConfidence: 0.8,
  minTrackingConfidence: 0.8,
});

hands.onResults((results) => {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  const mapaMao = {}; // {"Left": [...], "Right": [...]}

  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const mao = results.multiHandedness[i].label; // "Left" ou "Right"
      const landmarks = results.multiHandLandmarks[i];

      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 1 });
      drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 1, radius: 1.5 });

      mapaMao[mao] = landmarks;
    }

    // Reconhecer gesto com base nas duas mãos
    const { gesto, score, vetor } = reconhecerGesto(mapaMao);
    adicionarGestoNaFrase(gesto);
    exibirDebug(gesto, score, vetor);
  }

  canvasCtx.restore();
});



const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});

camera.start();
