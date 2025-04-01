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

const ASSIGNMENT_FILE = path.join("scale_counts.csv"); // stored locally per service


app.get("/ping", (req, res) => {
  res.status(200).send("Server awake");
});

app.get('/assign-condition', (req, res) => {
  // If file doesn't exist, create it
  if (!fs.existsSync(ASSIGNMENT_FILE)) {
    fs.writeFileSync(ASSIGNMENT_FILE, "condition,count\noriginal,1\nlabels,5\nlinear,5");
  }

  // Read and parse counts
  const lines = fs.readFileSync(ASSIGNMENT_FILE, "utf-8").trim().split('\n').slice(1);
  const counts = {};
  lines.forEach(line => {
    const [cond, count] = line.split(',');
    counts[cond] = parseInt(count);
  });

  // Assign least-used condition
  const chosen = Object.entries(counts).sort((a, b) => a[1] - b[1])[0][0];
  counts[chosen] += 1;

  // Write updated counts back
  const updated = "condition,count\n" + CONDITIONS.map(cond => `${cond},${counts[cond]}`).join('\n');
  fs.writeFileSync(ASSIGNMENT_FILE, updated);

  // Send assignment
  res.json({
    condition: chosen,
    image: CONDITION_IMAGES[chosen]
  });
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
