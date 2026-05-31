import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/db.config.js';

// create a new account
export const registerUser = async (req, res, next) => {
    try {
        const { user_name, email, password, profile_type } = req.body;

        // Validar se todos os campos obrigatórios vieram no body (profile_type is optional)
        if (!user_name || !email || !password) {
            return res.status(400).json({ message: "Todos os campos (user_name, email, password) são obrigatórios." });
        }

        // Tornar profile_type opcional: se não fornecido, por omissão assume-se 'estudante'
        let incomingProfile = profile_type;
        if (!incomingProfile) {
            incomingProfile = 'estudante';
        }

        let dbProfileType = incomingProfile;
        if (incomingProfile === 'funcionario') dbProfileType = 'staff';
        if (incomingProfile === 'estudante' || incomingProfile === 'docente') dbProfileType = 'student_teacher';

        // Validar se o profile_type é um dos aceites pela base de dados
        const allowedProfiles = ['student_teacher', 'staff', 'admin'];
        if (!allowedProfiles.includes(dbProfileType)) {
            return res.status(400).json({ message: "Tipo de perfil inválido. Use: admin, funcionario, estudante ou docente." });
        }

        // REGRA DO ENUNCIADO: Estudantes ou docentes registam-se obrigatoriamente usando o e-mail institucional
        if (dbProfileType === 'student_teacher') {
            if (!email.includes('esmad.ipp.pt') && !email.includes('esht.ipp.pt')) {
                return res.status(400).json({ message: "Estudantes e Docentes têm de se registar com o e-mail institucional." });
            }
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
            profile_type: dbProfileType,
            state: 'active'
        });

        return res.status(201).json({
            message: "Utilizador registado com sucesso!",
            user: {
                user_id: newUser.user_id,
                user_name: newUser.user_name,
                email: newUser.email,
                profile_type: incomingProfile 
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
            return res.status(400).json({ message: "Email and password are required." });
        }

        // Procurar o utilizador pelo email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Verificar se o utilizador está suspenso
        if (user.state === 'suspended') {
            return res.status(403).json({ message: "Your account is suspended. Contact an administrator." });
        }

        // Comparar a password enviada com a password encriptada na BD
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        // Traduz o perfil da BD de volta para 'funcionario' para que os teus middlewares 
        // e os controladores das ocorrências (que esperam 'funcionario') funcionem em harmonia
        const webProfileType = user.profile_type === 'staff' ? 'funcionario' : user.profile_type;

        // Gerar o Token JWT
        const secretKey = process.env.JWT_SECRET || 'chave_secreta_provisoria_pw2';
        const token = jwt.sign(
            { user_id: user.user_id, profile_type: webProfileType },
            secretKey,
            { expiresIn: '1d' }
        );

        return res.status(200).json({
            message: "Login successful!",
            token,
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                profile_type: webProfileType
            }
        });

    } catch (error) {
        console.error("Error in loginUser:", error);
        return res.status(500).json({ message: "Internal server error while logging in." });
    }
}

// get all users
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['user_id', 'user_name', 'email', 'profile_type', 'state']
        });
        return res.status(200).json(users);
    } catch (error) {
        console.error("Error in getAllUsers:", error);
        return res.status(500).json({ message: "Error while listing users." });
    }
}

// update an user
export const updateUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const { user_name, email, state } = req.body;

        // SEGURANÇA: Se não for admin, só pode editar o seu próprio ID
        if (req.loggedUser.profile_type !== 'admin' && String(req.loggedUser.user_id) !== String(user_id)) {
            return res.status(403).json({ message: "Access denied. You cannot edit the other users' profiles." });
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user_name) user.user_name = user_name;
        if (email) user.email = email;
        
        // Apenas admins podem suspender/ativar utilizadores
        if (state && req.loggedUser.profile_type === 'admin') {
            user.state = state;
        }

        await user.save();

        return res.status(200).json({
            message: "User updated successfully!",
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                email: user.email,
                profile_type: user.profile_type,
                state: user.state
            }
        });

    } catch (error) {
        console.error("Error in updateUser:", error);
        return res.status(500).json({ message: "Error while updating user." });
    }
}

// delete an user
export const deleteUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        // Proteção extra: impede que utilizadores comuns acessem o delete caso o middleware falhe
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can delete users." });
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (String(req.loggedUser.user_id) === String(user_id)) {
            return res.status(400).json({ message: "You cannot delete your own administrator account." });
        }

        await user.destroy();
        return res.status(200).json({ message: "User deleted successfully!" });

    } catch (error) {
        console.error("Error in deleteUser:", error);
        return res.status(500).json({ message: "Error while deleting user." });
    }
}