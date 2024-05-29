import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { readFile } from 'fs/promises';
const supabaseUrl = 'https://rjujpbbzlfzfemavnumo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWpwYmJ6bGZ6ZmVtYXZudW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTg2MzE5OCwiZXhwIjoyMDMxNDM5MTk4fQ.9GoC2ZHaoV5gjq_Y0H84FQ_cbhhkRzFSiIWmTeQG-RU';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage });


app.get('/estudios', async (req,res)=> {
    
    const { data, error } = await supabase
        .from('Estudios')
        .select('*');

    await res.send(data);
})
app.post('/estudio', async (req, res) => {
    const estudioFile = await readFile('60fa9175a0672.jpeg');
  
    // if (!estudioFile) {
    //   return res.status(400).send('No file uploaded.');
    // }
  
    // // Generate a unique file path (e.g., using a UUID)
    // const filePath = estudioFile.originalname;
    
    const estudios = upload.single('estudioFile');
    const { data, error } = await supabase
    .storage
    .from('estudios_bucket')
    .upload('60fa9175a0672.jpeg', estudios, {
        cacheControl: '3600',
        upsert: false
    })
    res.send("ok");
    // try {
    //   const { data, error } = await supabase
    //     .storage
    //     .from('estudios_bucket')
    //     .upload(filePath, estudioFile.buffer, {
    //       cacheControl: '3600',
    //       upsert: false,
    //       contentType: estudioFile.mimetype
    //     });
  
    //   if (error) {
    //     console.error('Error uploading file:', error.message);
    //     return res.status(500).send('Error uploading file.');
    //   }
  
    //   res.status(200).send(`File uploaded successfully: ${data.path}`);
    // } catch (error) {
    //   console.error('Unexpected error:', error);
    //   res.status(500).send('Unexpected error occurred.');
    // }
});

app.listen(3000,() => {
    console.log("Server running");
})