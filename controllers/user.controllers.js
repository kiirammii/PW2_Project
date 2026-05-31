import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/db.config.js';

// create a new account
export const registerUser = async (req, res, next) => {
    try {
        const { user_name, email, password, profile_type: requestedProfileType } = req.body;

        // Validar se todos os campos obrigatórios vieram no body (profile_type is optional)
        if (!user_name || !email || !password) {
            return res.status(400).json({ message: "All fields (user_name, email, password) are required." });
        }

        const profile_type = requestedProfileType || 'student_teacher';

        const allowedProfiles = ['student_teacher', 'staff', 'admin'];
        if (!allowedProfiles.includes(profile_type)) {
            return res.status(400).json({ message: "Invalid profile type. Use: admin, staff, or student_teacher." });
        }

        // Students and teachers must register with an institutional email
        if (profile_type === 'student_teacher') {
            if (!email.includes('esmad.ipp.pt') && !email.includes('esht.ipp.pt')) {
                return res.status(400).json({ message: "Students and Teachers must register with the institutional email." });
            }
        }

        // Verificar se o email já está registado
        const userExists = await User.findOne({ where: { email } });
        if (userExists) {
            return res.status(409).json({ message: "This email is already registered." });
        }

        // Encriptar a password com bcrypt por segurança
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Criar o utilizador na base de dados
        const newUser = await User.create({
            user_name,
            email,
            password: hashedPassword,
            profile_type: profile_type,
            state: 'active'
        });

        return res.status(201).json({
            message: "User registered successfully!",
            user: {
                user_id: newUser.user_id,
                user_name: newUser.user_name,
                email: newUser.email,
                profile_type: newUser.profile_type
            }
        });

    } catch (error) {
        console.error("Error in registerUser:", error);
        return res.status(500).json({ message: "Internal server error while registering user." });
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

        // Traduz o perfil da BD de volta para 'staff' para que os teus middlewares 
        // e os controladores das ocorrências (que esperam 'staff') funcionem em harmonia
        const webProfileType = user.profile_type === 'staff' ? 'staff' : user.profile_type;

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
        const { user_name, email, state, profile_type } = req.body;

        // SECURITY: If not admin, can only edit their own profile ID
        if (req.loggedUser.profile_type !== 'admin' && String(req.loggedUser.user_id) !== String(user_id)) {
            return res.status(403).json({ message: "Access denied. You cannot edit other users' profiles." });
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        if (user_name) user.user_name = user_name;
        if (email) user.email = email;
        
        // Only admins can suspend/activate users
        if (state && req.loggedUser.profile_type === 'admin') {
            user.state = state;
        }

        // Only admins can change the profile_type
        if (profile_type && req.loggedUser.profile_type === 'admin') {
            
            // Validate directly against the English DB terms
            const allowedProfiles = ['student_teacher', 'staff', 'admin'];
            if (!allowedProfiles.includes(profile_type)) {
                return res.status(400).json({ message: "Invalid profile type. Use: admin, staff, or student_teacher." });
            }

            // Protection: an admin cannot remove their own admin privileges via this route
            if (String(req.loggedUser.user_id) === String(user_id) && profile_type !== 'admin') {
                return res.status(400).json({ message: "You cannot remove your own administrator privileges." });
            }

            user.profile_type = profile_type;
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