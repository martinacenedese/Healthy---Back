import express, { text } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import cors from "cors";
import dotenv from 'dotenv'
import axios from "axios";
dotenv.config();
const supabaseUrl = 'https://rjujpbbzlfzfemavnumo.supabase.co';
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWpwYmJ6bGZ6ZmVtYXZudW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTg2MzE5OCwiZXhwIjoyMDMxNDM5MTk4fQ.9GoC2ZHaoV5gjq_Y0H84FQ_cbhhkRzFSiIWmTeQG-RU";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());
app.use(cors());
const storage = multer.memoryStorage();
const upload = multer({ storage });

async function insertToSupabase(table, values){
    const error = await supabase
            .from(table)
            .insert(values);
    return error;
}
async function uploadFileToSupabase(bucketName, fileBuffer, fileName, contentType) {
    try {
        // Upload file
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(fileName, fileBuffer, {
                cacheControl: '3600',
                upsert: false,
                contentType: contentType,
            });
        if (error) {
            console.error('Error uploading file:', error);
        }

        // Return the public URL of the uploaded file
        const publicURL = await supabase.storage.from(bucketName).createSignedUrl(fileName, 31536000000);
        return publicURL.data.signedUrl;
    } catch (error) {
        console.error('Error uploading file to Supabase:', error);
        return null;
    }
}

// funcion para poder mandar req. tipo post.
async function postReq (body, url){
    try{
        const response = await axios.post(url,body);
        return response.data;
    } catch(error){
        return { error: 'Error posting data, details: ' + error.message };        
    }
}

async function getReq (url){
    try{
        const data = await axios.get(url);
        return data;
    } catch (error){
        return {error: 'Error getting data, details: ' + error.message};
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
    const body = req.body;
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    const bucketName = 'estudios_bucket';
    const uniqueFileName = `${uuidv4()}-${file.originalname}`; // Generate a unique file name
    console.log("antes public url");
    // The function returns the publicURL with that params.
    const publicURL = await uploadFileToSupabase(bucketName, file.buffer, uniqueFileName, file.mimetype);
    
    if (!publicURL) {
        return res.status(500).send('Error uploading file to Supabase.');
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    //Cambiar por seguridad
    const error_insert = await insertToSupabase("Estudios", {
        archivo_estudios: publicURL, 
        tipo_estudios: body.tipo,
        fecha_estudios: body.date,
        quien_subio_estudios: body.quien_subio,
        id_usuarios: body.usuario}); 
    if(error_insert){
        console.log("Error insertando el archivo: ", error_insert);
        res.status(500).send('Error inserting data');

    }
    res.send(`File uploaded successfully. URL: ${publicURL}`);
});

app.post('/historial', async (req, res) => {
    const body = req.body;
    const x = {
        punto_historialmedico: body.punto,
        fecha_historialmedico: body.date,
        quien_subio_historialmedico: body.who,
        id_usuario: body.user,
        id_estudios: body.estudios}
    res.send("Post historial: ${x}" );
    try{
        const error_insert = await insertToSupabase ("Historial Medico", {
            punto_historialmedico: body.punto,
            fecha_historialmedico: body.date,
            quien_subio_historialmedico: body.who,
            id_usuario: body.user,
            id_estudios: body.estudios});
    }
    catch (error){
        res.send(`Medical historia inserted successfully.`);
    }

    
    res.send(`Medical historia inserted successfully.`);
});

app.get('/historial/:user', async (req,res) => {
    const user = req.params.user;
    const { data, error } = await supabase
        .from('Historial Medico')
        .select()
        .eq('id_usuario', user);
    
    if (error){
        res.status(500).send('Error inserting data');
    }
    res.send(data);
});

app.post('/turnos', async (req,res) => {
    const urlBehrend = "https://main-lahv.onrender.com/turnos";
    const body = req.body;
    try{
        const response = await postReq(body, urlBehrend);
        res.send(response);
    } catch (error) {
        res.status(500).send('Error posting data: ', error.message);
    }
}); 

app.get('/turnos:user', async (req,res) => {
    try{
        const urlBehrend = "https://main-lahv.onrender.com/turnos/${user}";
        const user = req.params.user;
        res.send(data);
        const data = await getReq(urlBehrend);
    }catch(error){
    

    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
