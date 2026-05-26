// handles only create account and login
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/db.config.js';

// create a new account
export const registerUser = async (req, res, next) => {
    try {
        const { user_name, email, password, profile_type } = req.body;

        // Validar se todos os campos obrigatórios vieram no body
        if (!user_name || !email || !password || !profile_type) {
            return res.status(400).json({ message: "Todos os campos (user_name, email, password, profile_type) são obrigatórios." });
        }

        // Verificar se o email já está registado
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(409).json({ message: "Este email já se encontra registado." });
        }

        // Encriptar a password com bcrypt por segurança
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Criar o utilizador na base de dados
        const newUser = await User.create({
            user_name,
            email,
            password: hashedPassword,
            profile_type,
            state: 'active'
        });

        return res.status(201).json({
            message: "Utilizador registado com sucesso!",
            user: {
                user_id: newUser.user_id,
                user_name: newUser.user_name,
                email: newUser.email,
                profile_type: newUser.profile_type
            }
        });

    } catch (error) {
        console.error("Erro no registerUser:", error);
        return res.status(500).json({ message: "Erro interno do servidor ao registar utilizador." });
    }
};

// login
export const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email e password são obrigatórios." });
        }

        // Procurar o utilizador pelo email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        // Verificar se o utilizador está suspenso
        if (user.state === 'suspended') {
            return res.status(403).json({ message: "A tua conta encontra-se suspensa. Contacta um administrador." });
        }

        // Comparar a password enviada com a password encriptada na BD
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Credenciais inválidas." });
        }

        // Gerar o Token JWT
        const secretKey = process.env.JWT_SECRET || 'chave_secreta_provisoria_pw2';
        const token = jwt.sign(
            { user_id: user.user_id, profile_type: user.profile_type },
            secretKey,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            message: "Login efetuado com sucesso!",
            token,
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                profile_type: user.profile_type
            }
        });

    } catch (error) {
        console.error("Erro no loginUser:", error);
        return res.status(500).json({ message: "Erro interno do servidor ao efetuar login." });
    }
}