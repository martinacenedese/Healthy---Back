import express from 'express';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rjujpbbzlfzfemavnumo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJqdWpwYmJ6bGZ6ZmVtYXZudW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNTg2MzE5OCwiZXhwIjoyMDMxNDM5MTk4fQ.9GoC2ZHaoV5gjq_Y0H84FQ_cbhhkRzFSiIWmTeQG-RU';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
app.use(express.json());

app.get('/estudios', async (req,res)=> {
    
    const { data, error } = await supabase
        .from('Estudios')
        .select('*');

    await res.send(data);
})
app.post('/estudios', async (req,res)=> {
    
    const body = req.body;
    const { data, error } = await supabase
        .from('Estudios')
        .select('*');

    await res.send(data);
})

app.listen(3000,() => {
    console.log("Server running");
})