import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/db.config.js';

// get all users
export const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['user_id', 'user_name', 'email', 'profile_type', 'state']
        });
        return res.status(200).json(users);
    } catch (error) {
        console.error("Erro no getAllUsers:", error);
        return res.status(500).json({ message: "Erro ao listar utilizadores." });
    }
}

// update an user
export const updateUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const { user_name, email, state } = req.body;

        // SEGURANÇA: Se não for admin, só pode editar o seu próprio ID
        if (req.loggedUser.profile_type !== 'admin' && String(req.loggedUser.user_id) !== String(user_id)) {
            return res.status(403).json({ message: "Acesso negado. Não podes editar o perfil de outros utilizadores." });
        }

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ message: "Utilizador não encontrado." });
        }

        if (user_name) user.user_name = user_name;
        if (email) user.email = email;
        
        // Apenas admins podem suspender/ativar utilizadores
        if (state && req.loggedUser.profile_type === 'admin') {
            user.state = state;
        }

        await user.save();

        return res.status(200).json({
            message: "Utilizador atualizado com sucesso!",
            user: {
                user_id: user.user_id,
                user_name: user.user_name,
                email: user.email,
                profile_type: user.profile_type,
                state: user.state
            }
        });

    } catch (error) {
        console.error("Erro no updateUser:", error);
        return res.status(500).json({ message: "Erro ao atualizar utilizador." });
    }
}

// delete an user
export const deleteUser = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json({ message: "Utilizador não encontrado." });
        }

        if (String(req.loggedUser.user_id) === String(user_id)) {
            return res.status(400).json({ message: "Não podes eliminar a tua própria conta de administrador." });
        }

        await user.destroy();
        return res.status(200).json({ message: "Utilizador eliminado com sucesso!" });

    } catch (error) {
        console.error("Erro no deleteUser:", error);
        return res.status(500).json({ message: "Erro ao eliminar utilizador." });
    }
}