import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// configuration
cloudinary.config({
    cloud_name: process.env.C_CLOUD_NAME,
    api_key: process.env.C_API_KEY,
    api_secret: process.env.C_API_SECRET
});

// define how and where the files should be stored in Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'ocorrencias_fotos',
        allowed_formats: ['jpg', 'jpeg', 'png'],
    },
});

// create a multer instance with the defined storage
export const upload = multer({ storage: storage });