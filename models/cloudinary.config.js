import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// 1. Configuração com as variáveis do slide da stora
cloudinary.config({
    cloud_name: process.env.C_CLOUD_NAME,
    api_key: process.env.C_API_KEY,
    api_secret: process.env.C_API_SECRET
});

// 2. Definir onde e como as imagens vão ser guardadas no Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ocorrencias_fotos', // Nome da pasta que vai ser criada no Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png'], // Formatos permitidos
    },
});

// 3. Criar o middleware do Multer configurado com a Cloud
export const upload = multer({ storage: storage });