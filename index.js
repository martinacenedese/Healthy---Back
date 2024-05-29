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

async function uploadFileToSupabase(bucketName, fileBuffer, fileName, contentType) {
    try {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileBuffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: contentType,
            });

        if (error) {
            console.error('Error uploading file:', error.message);
            return null;
        }

        // Return the public URL of the uploaded file
        const publicURL = await supabase.storage.from(bucketName).createSignedUrl(fileName,31536000000);
        return publicURL.data.signedUrl;
    } catch (error) {
        console.error('Error uploading file to Supabase:', error);

    }
}
app.get('/estudios', async (req,res)=> {
    
    const { data, error } = await supabase
        .from('Estudios')
        .select('*');

    await res.send(data);
})

app.get('/', (req, res) =>
    res.send("HOLA VERCEL"));


//async function uploadFile(file) {
    //const { data, error } = await supabase.storage.from('estudios_bucket').upload('60fa9175a0672.jpeg', file)
    //if (error) {
       // console.error('Error uploading file:', error.message);
    //} else {
      // Handle success
    //}
  //}

app.post('/estudio', upload.single('file'), async (req, res) => {
    const file = req.file;

    if (!file) {
      return res.status(400).send('No file uploaded.');
    }
  
    const bucketName = 'estudios_bucket';
    const uniqueFileName = `${uuidv4()}-${file.originalname}`; // Generate a unique file name
  
    const publicURL = await uploadFileToSupabase(bucketName, file.buffer, uniqueFileName, file.mimetype);
  

  
    res.send(`File uploaded successfully. URL: ${publicURL}`);
        // try {
        //   // Upload file to Supabase bucket
        //   const file = await fs.readFile('descarga (4).jpg');
        //   const { data, error } = await supabase.storage
        //     .from('estudios_bucket') 
        //     .upload("messi", file.buffer);
      
        //   if (error) {
        //     throw error;
        //   }
      
        //   // Get URL of the uploaded file
        //   const fileUrl = data.Key;
      
        //   res.send('File uploaded successfully. URL: ${fileUrl}');
        // } catch (error) {
        //   console.error('Error uploading file:', error.message);
        //   res.status(500).send('Error uploading file');
        // }
      });
    //const file  = fs.readFile;
    
    //uploadFile(file);
     
    // if (!estudioFile) {
    //   return res.status(400).send('No file uploaded.');
    // }
  
    // // Generate a unique file path (e.g., using a UUID)
    // const filePath = estudioFile.originalname;
    
    //const estudios = upload.single('estudioFile');
    //const { data, error } = await supabase
    //.storage
    //.from('estudios_bucket')
    //.upload('60fa9175a0672.jpeg', estudios, {
       // cacheControl: '3600',
       // upsert: false
   // })
    
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


app.listen(3000,() => {
    console.log("Server running");
})