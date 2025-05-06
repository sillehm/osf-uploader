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

// OSF ping
app.get('/ping', (req, res) => {
  res.status(200).send("Server awake");
});

// Upload data to OSF
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
      console.error("OSF upload error:", errorText);
      throw new Error(errorText);
    }

    res.status(200).send("Upload successful!");
  } catch (err) {
    console.error("Upload failed:", err);
    res.status(500).send("Upload failed");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
