import express, { text } from 'express';
import multer from 'multer';
import { createClient, lockInternals } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import cors from "cors";
import dotenv from 'dotenv'
import axios from "axios";
import bcrypt from 'bcrypt';
dotenv.config();
const supabaseUrl = 'https://rjujpbbzlfzfemavnumo.supabase.co';
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWpwYmJ6bGZ6ZmVtYXZudW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTg2MzE5OCwiZXhwIjoyMDMxNDM5MTk4fQ.9GoC2ZHaoV5gjq_Y0H84FQ_cbhhkRzFSiIWmTeQG-RU";
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
// Cuales URL estan permitidas hacer req.
const allowedOrigins = ['http://localhost:5173', 'https://josephfiter.online', "http://localhost:3000"];

// app.use(cors(corsOptions));

app.use(cors({
    origin: "*",
    methods: ['POST', 'PUT', 'GET', 'DELETE', 'OPTIONS', 'HEAD'],
    credentials: true,
    allowedHeaders: '*'

})
);
app.set("trust proxy", 1);
//pp.options('*', cors());
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

//funcion para generar link al medico.
async function userURL(id, url) {
    try {
        const hash = await bcrypt.hash(id, 10);
        return url + '/' + hash;
    } catch (error) {
        console.log('Error userURL, details: ' + error.message);
        throw error;
    }
}

app.use(express.json());

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
        //aca hay un problema
        res.status(500).send('Error uploading file to Supabase.');
    }
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    //Cambiar por seguridad
    const error_insert = await insertToSupabase("Estudios", {
        archivo_estudios: publicURL,
        tipo_estudios: body.tipo,
        fecha_estudios: body.date,
        quien_subio_estudios: body.quien_subio,
        id_usuarios: body.usuario
    });
    if (error_insert) {
        console.log("Error insertando el archivo: ", error_insert);
        res.status(500).send('Error inserting data');

    }
    try {
        let formData = new FormData();
        formData.append('file', file);
        const urlSuch = 'https://hjuyhjiuhjdsadasda-healthy.hf.space/upload-image/';
        const data = await postReq(formData, urlSuch);
        console.log("req ia: ", data);
        return res.send(data);
    } catch (error) {
        console.log(error);
        res.status(500).send('Error posting data to AI');
    }

    res.send(`File uploaded successfully. URL: ${publicURL}`);
});

app.post('/historial', async (req, res) => {
    const body = req.body;
    console.log(typeof (body), {
        punto_historialmedico: body.punto,
        fecha_historialmedico: body.date,
        quien_subio_historialmedico: body.who,
        id_usuario: body.user,
        id_estudios: body.estudios
    })
    // res.send()
    const error_insert = await insertToSupabase("Historial Medico", {
        punto_historialmedico: body.punto,
        fecha_historialmedico: body.date,
        quien_subio_historialmedico: body.who,
        id_usuario: body.user,
        id_estudios: body.estudios
    });

    if (error_insert.error) {
        return res.status(500).send('Error posting data: '+ error_insert.error);
    }
    else {
        return res.send(`Medical historia inserted successfully.`);
    }


});

app.get('/historial/:user', async (req, res) => {
    const user = req.params.user;
    const { data, error } = await supabase
        .from('Historial Medico')
        .select()
        .eq('id_usuario', user);

    if (error) {
        res.status(500).send('Error inserting data');
    }
    res.send(data);
});

app.post('/turnos', async (req, res) => {
    try {
        const body = req.body;
        const urlBehrend = "https://main-lahv.onrender.com/turnos";
        const response = await postReq(body, urlBehrend);
        return res.send(response.data);
    } catch (error) {
        res.status(500).send('Error posting data: ', error.message);
    }
});

app.get('/turnos', async (req, res) => {
    // try {
        const user = req.params.user;
        const urlBehrend = "https://main-lahv.onrender.com/turnos";
        const data = await getReq(urlBehrend);
        console.log(data);
        return res.send(data.data);
    // } catch (error) {
    //     res.status(500).send('Error getting data', error);
    // }
});

app.get('/userURL/:user', async (req, res) => {
    try {
        const user = req.params.user;
        const url = await userURL(user, 'https://josephfiter.online');
        console.log(url);
        res.send(url);
    } catch (error) {
        console.log(error);
    }
})

app.post('/signup', async (req,res)=> {
    const body = req.body;
    console.log(body.password, body.mail);
    const password = await bcrypt.hash(body.password, 10);
    const error_insert = await insertToSupabase("Usuarios", {
        password_usuarios: password,
        mail_usuarios: body.mail
    })
    console.log(error_insert);
    if (error_insert.error) {
        return res.status(500).send('Error posting data: '+ error_insert);
    }
    else {
        return res.send(`User created successfully.`);
    }
})

app.post('/login', async (req,res)=> {
    const body = req.body;
    const { data, error } = await supabase
        .from('Usuarios')
        .select()
        .eq('mail_usuarios', body.mail);
    
    if(!data[0]){
        res.status(500).send('User not found');    }
    if (bcrypt.compareSync(body.password, data[0].password_usuarios)){
        res.send("Login succesful");
    }
    else{
        res.send("Password incorrect");
    }
    if (error) {
        res.status(500).send('Error inserting data');
    }
})
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
