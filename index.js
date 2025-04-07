import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const OSF_TOKEN = process.env.OSF_TOKEN;
const OSF_PROJECT_ID = process.env.OSF_PROJECT_ID;

const CONDITIONS = ["original", "labels", 'linear'];
const CONDITION_IMAGES = {
  original: "https://raw.githubusercontent.com/sillehm/Climate-label-judgement/main/scales/scale_original.png",
  labels: null,
  linear: "https://raw.githubusercontent.com/sillehm/Climate-label-judgement/main/scales/scale_linear.png"
};

app.get('/assign-condition', async (req, res) => {
  const SCALE_FILE = 'scale_counts.csv';
  const osfBaseUrl = `https://files.osf.io/v1/resources/${OSF_PROJECT_ID}/providers/osfstorage`;

  try {
    // 1. Get metadata to find the file ID or download link
    const metaResp = await fetch(`${osfBaseUrl}/?token=${OSF_TOKEN}`);
    const metaJson = await metaResp.json();

    const fileMeta = metaJson.data.find(f => f.attributes && f.attributes.name === SCALE_FILE);
    if (!fileMeta) throw new Error("scale_counts.csv not found in OSF project.");

    const downloadUrl = fileMeta.links.download;

    // 2. Fetch the actual CSV content
    const downloadResp = await fetch(downloadUrl);
    const csvText = await downloadResp.text();

    const lines = csvText.trim().split('\n').slice(1);
    const counts = {};
    lines.forEach(line => {
      const [cond, count] = line.split(',');
      counts[cond] = parseInt(count);
    });

    // 3. Assign least-used condition
    const chosen = Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
    counts[chosen] += 1;

    // 4. Rebuild updated CSV
    const updatedCsv = "condition,count\n" + CONDITIONS.map(cond => `${cond},${counts[cond]}`).join('\n');

    // 5. Upload updated file back
    const uploadResp = await fetch(`${osfBaseUrl}/?name=${SCALE_FILE}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${OSF_TOKEN}`,
        'Content-Type': 'text/csv'
      },
      body: updatedCsv
    });

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      throw new Error(`Upload failed: ${uploadResp.status} - ${errorText}`);
    }

    // 6. Return to frontend
    res.json({
      condition: chosen,
      image: CONDITION_IMAGES[chosen]
    });

  } catch (err) {
    console.error("Condition assignment failed:", err);
    res.status(500).send("Condition assignment failed: " + err.message);
  }
});



app.get("/ping", (req, res) => {
  res.status(200).send("Server awake");
});

app.post('/upload', async (req, res) => {
  const { filename, content } = req.body;

  try {
    const response = await fetch(`https://files.osf.io/v1/resources/${OSF_PROJECT_ID}/providers/osfstorage/?name=${filename}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${OSF_TOKEN}`,
        'Content-Type': 'text/csv'
      },
      body: content
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OSF response status:", response.status);
      console.error("OSF response text:", errorText);
      throw new Error(errorText);
    }


    res.status(200).send("Upload successful!");
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).send("Upload failed: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
