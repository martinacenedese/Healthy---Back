import axios from 'axios';
import { readFile } from 'fs/promises';

async function uploadFile() {
  try {
    // Read the file as binary data
    const data = await readFile('60fa9175a0672.jpeg');

    // Axios POST request configuration
    const config = {
      method: 'post',
      url: 'http://localhost:3000/upload',
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: {
        avatar: {
          value: data,
          options: {
            filename: '60fa9175a0672.jpeg',
            contentType: 'image/jpeg'
          }
        }
      }
    };

    // Make the POST request
    const response = await axios(config);
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

uploadFile();
