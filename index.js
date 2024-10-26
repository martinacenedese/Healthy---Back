import express, { json, text } from 'express';
import multer from 'multer';
import { createClient, lockInternals } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import axios from 'axios';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import bodyParser from 'body-parser';

const supabaseUrl = 'https://rjujpbbzlfzfemavnumo.supabase.co';
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWpwYmJ6bGZ6ZmVtYXZudW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTg2MzE5OCwiZXhwIjoyMDMxNDM5MTk4fQ.9GoC2ZHaoV5gjq_Y0H84FQ_cbhhkRzFSiIWmTeQG-RU";
const supabase = createClient(supabaseUrl, supabaseKey);
const app = express();
// Cuales URL estan permitidas hacer req.
const allowedOrigins = ['http://localhost:5173', 'https://josephfiter.online', "http://localhost:3000"];

const upload = multer({ 
    storage: multer.memoryStorage(), // Usando memoryStorage para almacenar archivos en la memoria temporalmente
    limits: { fileSize: 100 * 1024 * 1024},
    json: true
});

app.use(express.json());

app.use(cors({
    origin: "*",
    methods: ['POST', 'PUT', 'GET', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: true,
    allowedHeaders: '*'
})
);

app.set("trust proxy", 1);

async function insertToSupabase(table, values) {
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
async function postReq(body, url, headers = null) {
    try {
        const response = await axios.post(url, body, headers);
        return response.data;
    } catch (error) {
        return { error: 'Error posting data, details: ' + error.message };
    }
}

// funcion para poder mandar un req. tipo get.
async function getReq(url) {
    try {
        const data = await axios.get(url);
        return data;
    } catch (err) {
        return { error: 'Error getting data, details: ' + err.message };
    }
}

function authenticateToken (req, res, next) {
    //Bearer token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let token_limpio = token.slice(1, -1);
 
    if (token_limpio === null) return res.sendStatus(401);
    jwt.verify(token_limpio, process.env.ACCESS_TOKEN_SECRET, (err,id) => {
        if (err) return res.status(403); //token expiration
        req.id = id;
        next();
    })
}

function generateAcessToken(id){
    return jwt.sign({id: id}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '10m'});
}

app.get('/estudios', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('Estudios')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    res.send(data.filter(data => data.id_usuarios === req.id.id));
});

app.post('/estudio', upload.single('file'), authenticateToken, async (req, res) => {

    const file = req.file.buffer;
    const body = req.body;

    if (!file) {
        return res.status(400).json({error:'No file uploaded.'});
    }

    const bucketName = 'estudios_bucket';
    const uniqueFileName = `${uuidv4()}-${file.originalname}`; // Generate a unique file name
    // The function returns the publicURL with that params.
    const publicURL = await uploadFileToSupabase(bucketName, file.buffer, uniqueFileName, file.mimetype);

    if (!publicURL) {
        return res.status(500).send('Error uploading file to Supabase.');
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const error_insert = await insertToSupabase("Estudios", {
        archivo_estudios: publicURL,
        tipo_estudios: body.tipo,
        fecha_estudios: body.date,
        quien_subio_estudios: body.quien_subio,
        id_usuarios: req.id.id
    });
    
    if (error_insert) {
        return res.status(500).send('Error inserting data');
    }

    try {
        let formData = new FormData();
        formData.append('file', file);
        const urlSuch = 'https://hjuyhjiuhjdsadasda-healthy.hf.space/upload-image/';
        const data = await postReq(formData, urlSuch);
        return res.send(data);
    } catch (error) {
        console.log(error);
        return res.status(500).send('Error posting data to AI');
    }
    return res.send(`File uploaded successfully. URL: ${publicURL}`);

});

app.post('/historial', authenticateToken, async (req, res) => {
    const body = req.body;
    const error_insert = await insertToSupabase("Historial Medico", {
        punto_historialmedico: body.punto,
        fecha_historialmedico: body.date,
        quien_subio_historialmedico: body.who,
        id_usuario: req.id.id,
        id_estudios: body.estudios
    });

    if (error_insert.error) {
        return res.status(500).send('Error posting data: '+ error_insert.error);
    }
    else {
        return res.send(`Medical historia inserted successfully.`);
    }
});

app.get('/historial', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('Historial Medico')
        .select('*');

    if (error) {
        res.status(500).send('Error inserting data');
    }
    res.send(data.filter(data => data.id_usuario === req.id.id)); //Filtra la data donde el usuario coincida
});

app.post('/turnos', authenticateToken, async (req, res) => {
    try {
        const body = req.body;
        body.paciente = req.id.id;
        const urlBehrend = "https://main-lahv.onrender.com/turnos";
        const response = await postReq(body, urlBehrend);
        return res.send(response.data);
    } catch (error) {
        res.status(500).send('Error posting data: ', error.message);
    }
});

app.post('/electrocardiograma', async (req, res) => {
    try {
        const body = req.body;
        const urlBehrend = "http://localhost:3000/electrocardiograma";
        const response = await postReq(body, urlBehrend);
        const { error } = await supabase
            .from('Estudios')
            //cambiar por campo de diagnostico
            .update({ diagnostico: response })
            //asumo que hay un atributo del body id
            .eq('id', body.id)
        if(error.error){
            res.status(500).send("Error insertando el diagnostico");
        }
        else{
            return res.send("Diagnostico insertado correctamente");
        }
    } catch (error) {
        res.status(500).send('Error posting data: ', error.message);
    }
});

app.get('/turnos', authenticateToken, async (req, res) => {
        const urlBehrend = "https://main-lahv.onrender.com/turnos";
        const data = await getReq(urlBehrend);
        return res.send(data.data.filter(data => parseInt(data.paciente) === req.id.id));
});

app.get('/userURL', authenticateToken, async (req, res) => {
    try {
        const user = req.id.id;
        const url = await userURL(user, 'https://josephfiter.online');
        res.send(url);
    } catch (error) {
        console.log(error);
    }
})

app.post('/signup', async (req,res)=> {
    const body = req.body;
    const password = await bcrypt.hash(body.password, 10);
    const error_insert = await insertToSupabase("Usuarios", {
        nombre_usuarios: body.name,
        password_usuarios: password,
        mail_usuarios: body.mail
    })
    if (error_insert.error) {
        return res.status(500).send('Error posting data: '+ error_insert);
    }
    else {
        return res.send(`User created successfully.`);
    }
})

app.post('/login', async (req,res)=> {
    const body = req.body;
    const name = body.name;
    const password = body.password;

    const { data, error } = await supabase
        .from('Usuarios')
        .select()
        .eq('nombre_usuarios', body.name);
    
    if(!data[0]){
        res.status(500).send('User not found');    }
    let compared = await bcrypt.compareSync(password, data[0].password_usuarios);
    if (compared){
        const id = data[0].id_usuarios;
        const accessToken = generateAcessToken;
        const refreshToken = jwt.sign({id: id}, process.env.REFRESH_TOKEN_SECRET);
        res.json(accessToken, refreshToken);
    }
    else{
        res.send("Password incorrect");
    }
    if (error) { 
        res.status(500).send('Error inserting data');
    }
})

app.get('/nombre', authenticateToken, async (req,res) => {
    const id = req.id.id;

    const { data, error } = await supabase
        .from('Usuarios')
        .select('nombre_usuarios')
        .eq('id_usuarios', id);
    return res.send(data);
})

app.get('/perfil', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('Perfil')
        .select('*');

    if (error) {
        res.status(500).send('Error inserting data');
    }
    console.log(data.filter(data => data.id_usuarios === req.id.id));
    res.send(data.filter(data => data.id_usuarios === req.id.id));
});

app.post('/perfil', async (req,res)=> {
    const body = req.body;
    const error_insert = await insertToSupabase("Perfil", {
        nombre_perfil: body.nombre1,
        edad_perfil: body.edad1,
        altura_perfil: body.altura1,
        peso_perfil: body.peso,
        enfermedadescronicas_perfil: body.enfermedades,
        tiposangre_perfil: body.sangre,
        médicocabecera_perfil: body.medico,
        nmatricula_perfil: body.matricula,
        obrasocial_perfil:body.obra,
        plan_perfil: body.plan,
        id_usuarios: 21
    })
    if (error_insert.error) {
        console.log(error_insert);
        return res.status(500).send('Error posting data: '+ error_insert);
    }
});

app.post('/foto', upload.single('file'), authenticateToken, async (req, res) => {

    const file = req.file.buffer;
    const body = req.body;

    if (!file) {
        return res.status(400).json({error:'No file uploaded.'});
    }

    const bucketName = 'perfil_bucket';
    const uniqueFileName = `${uuidv4()}-${file.originalname}`; // Generate a unique file name
    // The function returns the publicURL with that params.
    const publicURL = await uploadFileToSupabase(bucketName, file.buffer, uniqueFileName, file.mimetype);

    if (!publicURL) {
        return res.status(500).send('Error uploading file to Supabase.');
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const error_insert = await insertToSupabase("Perfil", {
        foto_perfil: publicURL
    });
    
    if (error_insert) {
        return res.status(500).send('Error inserting data');
    }
    return res.send(`File uploaded successfully. URL: ${publicURL}`);
});

app.get('/foto', authenticateToken, async (req, res) => {
    const { data, error } = await supabase
        .from('Perfil')
        .select('*');

    if (error) {
        console.error('Error fetching data:', error.message);
        return res.status(500).send('Error fetching data');
    }
    res.send(data.filter(data => data.id_usuarios === req.id.id));
});

let refreshTokens = [];

app.post('/token',(req, res) => {
    const refreshToken = req.body.token;
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
