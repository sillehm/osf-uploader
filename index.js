import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const OSF_TOKEN = process.env.OSF_TOKEN;
const OSF_PROJECT_ID = process.env.OSF_PROJECT_ID;

app.post('/upload', async (req, res) => {
  const { filename, content } = req.body;

  console.log("Received upload request:", filename);

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
      throw new Error(errorText);
    }

    console.log("✅ Upload to OSF successful!");
    res.status(200).send("Success");
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).send("Upload failed: " + err.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
