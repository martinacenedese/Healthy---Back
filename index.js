import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import cors from "cors";

const supabaseUrl = 'https://rjujpbbzlfzfemavnumo.supabase.co';
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWpwYmJ6bGZ6ZmVtYXZudW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTg2MzE5OCwiZXhwIjoyMDMxNDM5MTk4fQ.9GoC2ZHaoV5gjq_Y0H84FQ_cbhhkRzFSiIWmTeQG-RU";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({ storage });

async function insertToSupabase(table, file, tipo, diagnostico, fecha, quienSubio){
//TERMINAR FUNCION
    const { data, error } = await supabase.storage
            .from(table)
            .upload(file)
}
async function uploadFileToSupabase(bucketName, fileBuffer, fileName, contentType) {
    try {
        console.log("antes upload");
        console.log(fileName, fileBuffer, {
            cacheControl: '3600',
            upsert: false,
            contentType: contentType,
        });
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileBuffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: contentType,
            });
        console.log("desoyes upload");
        if (error) {
            console.error('Error uploading file:', error);
        }

        // Return the public URL of the uploaded file
        console.log("antes url");
        const publicURL = await supabase.storage.from(bucketName).createSignedUrl(fileName, 31536000000);
        console.log("despies url");
        return publicURL.data.signedUrl;
    } catch (error) {
        console.error('Error uploading file to Supabase:', error);
        return null;
    }
}

app.get('/estudios', async (req, res) => {
    const { data, error } = await supabase
        .from('Estudios')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }

    res.send(data);
});

app.post('/estudio', upload.single('file'), async (req, res) => {
    const file = req.file;
    console.log(file);
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    const bucketName = 'estudios_bucket';
    const uniqueFileName = `${uuidv4()}-${file.originalname}`; // Generate a unique file name
    console.log("antes public url");
    const publicURL = await uploadFileToSupabase(bucketName, file.buffer, uniqueFileName, file.mimetype);

    if (!publicURL) {
        return res.status(500).send('Error uploading file to Supabase.');
    }

    res.send(`File uploaded successfully. URL: ${publicURL}`);
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
