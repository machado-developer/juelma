const express = require("express");
const fs = require("fs");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = 4000;
const DB_PATH = "./gestos.txt";

app.use(cors());
app.use(bodyParser.json());

// Rota para salvar um novo gesto
app.post("/gestos", (req, res) => {
  const { label, idioma, vetor } = req.body;

  if (!label || !vetor) {
    return res.status(400).json({ erro: "Dados incompletos." });
  }

  // Lê os gestos salvos
  let gestos = [];
  if (fs.existsSync(DB_PATH)) {
    const conteudo = fs.readFileSync(DB_PATH, "utf-8");
    gestos = conteudo ? JSON.parse(conteudo) : [];
  }

  // Adiciona o novo gesto
  gestos.push({ label, idioma, vetor });

  // Salva de volta no arquivo
  fs.writeFileSync(DB_PATH, JSON.stringify(gestos, null, 2));
  res.json({ mensagem: "Gesto salvo com sucesso!", total: gestos.length });
});

// Rota para listar os gestos
app.get("/gestos", (req, res) => {
  if (!fs.existsSync(DB_PATH)) return res.json([]);
  const conteudo = fs.readFileSync(DB_PATH, "utf-8");
  const gestos = conteudo ? JSON.parse(conteudo) : [];
  res.json(gestos);
});

app.listen(PORT, () => {
  console.log(` Servidor iniciado em http://localhost:${PORT}`);
});
