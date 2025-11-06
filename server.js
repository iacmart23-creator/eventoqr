import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createCanvas, loadImage } from "canvas";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// ✅ ROTTA PER INVIO INVITO PERSONALIZZATO
app.post("/iscrizione", async (req, res) => {
  try {
    const { nome, cognome, email } = req.body;

    if (!nome || !cognome || !email) {
      return res.status(400).send("❌ Tutti i campi sono obbligatori.");
    }

    console.log(`📩 Nuova iscrizione: ${nome} ${cognome} (${email})`);

    // 1️⃣ Carica la locandina base
    const baseImage = await loadImage("./locandina.jpg");
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(baseImage, 0, 0, baseImage.width, baseImage.height);

    // 2️⃣ Scrivi nome e cognome al centro
    ctx.font = "bold 64px Sans-serif";
    ctx.fillStyle = "#E0A15C";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Effetto ombra per risaltare il testo
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    ctx.fillText(`${nome} ${cognome}`, baseImage.width / 2, baseImage.height / 2-60);

    // 3️⃣ Salva l’immagine personalizzata
    const invitiDir = path.join(__dirname, "public", "inviti");
    if (!fs.existsSync(invitiDir)) fs.mkdirSync(invitiDir, { recursive: true });

    const fileName = `${nome}_${cognome}.jpg`.replace(/\s+/g, "_");
    const filePath = path.join(invitiDir, fileName);

    const out = fs.createWriteStream(filePath);
    const stream = canvas.createJPEGStream();
    stream.pipe(out);
    await new Promise((resolve) => out.on("finish", resolve));

    // 4️⃣ Imposta il trasporto email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 5️⃣ Invia l'email con l'immagine allegata e visibile nel corpo
    await transporter.sendMail({
      from: `"ORIGINS" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Il tuo invito personalizzato - ORIGINS",
      html: `
        <h2>Ciao ${nome} ${cognome} 🎉</h2>
        <p>Ecco il tuo invito personalizzato per l’evento <b>ORIGINS</b>!</p>
        <p>Puoi scaricarlo o mostrarlo all’ingresso dell’evento.</p>
        <br>
        <img src="cid:invitoimg" alt="Invito ORIGINS" style="max-width:100%; border-radius:12px;" />
        <br><br>
        <p>📅 Ti aspettiamo all’evento!<br>Grazie per esserti registrato 🙌</p>
      `,
      attachments: [
        {
          filename: fileName,
          path: filePath,
          cid: "invitoimg", // questo mostra l'immagine direttamente nel corpo dell'email
        },
      ],
    });

    console.log(`✅ Email inviata correttamente a ${email}`);
    res.send("✅ Invito generato e inviato via email!");
  } catch (err) {
    console.error("❌ Errore:", err);
    res.status(500).send("Errore durante la generazione o l'invio dell'email.");
  }
});

// ✅ AVVIO SERVER
app.listen(3000, () => console.log("🚀 Server avviato su http://localhost:3000"));
