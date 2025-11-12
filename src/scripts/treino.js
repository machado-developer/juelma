let camera, hands;
let capturas = [];
let resultadoAtual = {};

const videoElement = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
canvasElement.width = 640;
canvasElement.height = 480;
function centralizar(landmarks) {
  if (!landmarks || landmarks.length === 0) return [];
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
  if (!a || !b) return landmarks;

  const distancia = Math.sqrt(
    (a.x - b.x) ** 2 +
    (a.y - b.y) ** 2 +
    (a.z - b.z) ** 2
  ) || 1; // evita divisão por zero

  return landmarks.map(p => ({
    x: p.x / distancia,
    y: p.y / distancia,
    z: p.z / distancia,
  }));
}

function vetor(a, b) {
  if (!a || !b) return { x: 0, y: 0, z: 0 };
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
  const divisor = mag1 * mag2 || 1;
  const cosTheta = dot / divisor;
  const clamped = Math.min(Math.max(cosTheta, -1), 1);
  const angle = Math.acos(clamped) * (180 / Math.PI);
  return isFinite(angle) ? angle : 0;
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
      const angulo = calcularAngulo(v1, v2);
      angulos.push(angulo);
    }
  }

  return angulos;
}

function vetorFinalValido(vetor) {
  return vetor.every(v => typeof v === "number" && isFinite(v) && !Number.isNaN(v));
}
function main() {
  if (!videoElement || !canvasElement) {
    console.error("Elementos de vídeo ou canvas não encontrados.");
    return;
  }
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });


  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.8,
    minTrackingConfidence: 0.8,
  });

  hands.onResults(onResults);

  camera = new Camera(videoElement, {
    onFrame: async () => {
      await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480,
  });
  camera.start();
}



function onResults(results) {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  resultadoAtual = { maoEsquerda: null, maoDireita: null };

  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const classificacao = results.multiHandedness[i].label;
      const landmarks = results.multiHandLandmarks[i];

      if (!landmarks) continue;

      const centralizados = centralizar(landmarks);
      const normalizados = normalizar(centralizados);

      const posicional = normalizados.flatMap(p => [p.x, p.y, p.z]);
      const angulos = extrairAngulos(normalizados);
      const vetor = [...posicional, ...angulos];

      if (!vetorFinalValido(vetor)) {
        console.warn(`Vetor inválido detectado na mão ${classificacao}`);
        continue;
      }

      if (classificacao === "Left") resultadoAtual.maoEsquerda = vetor;
      if (classificacao === "Right") resultadoAtual.maoDireita = vetor;

      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 1 });
      drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 1, radius: 1.5 });
    }
  }

  document.getElementById("dados").textContent = JSON.stringify(resultadoAtual, null, 2);
}



function capturarGesto() {
  if (!resultadoAtual.maoEsquerda && !resultadoAtual.maoDireita) {
    alert("Nenhuma mão detectada.");
    return;
  }
  capturas.push({ ...resultadoAtual });
  console.log("Gesto capturado!");
}

async function salvarGesto() {
  const label = document.getElementById("labelInput").value;
  if (!label || capturas.length === 0) {
    return alert("Preencha o nome do gesto e capture pelo menos 1 vez.");
  }

  for (let i = 0; i < capturas.length; i++) {
    const captura = capturas[i];

    // Unifica os vetores das mãos (pode ser null se não detectado)
    const vetorEsquerda = captura.maoEsquerda ?? [];
    const vetorDireita = captura.maoDireita ?? [];

    const vetorUnificado = [...vetorEsquerda, ...vetorDireita];

    await axios.post("http://localhost:4000/gestos", {
      label: label.toUpperCase(),
      idioma: "Libras",
      vetor: vetorUnificado,
    });
  }

  alert("Gesto(s) salvo(s) com sucesso!");
  limparCapturas();
}


function limparCapturas() {
  capturas = [];
  document.getElementById("labelInput").value = "";
  document.getElementById("dados").textContent = "";
}

main();