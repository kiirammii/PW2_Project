import { Comment, Occurrence } from '../models/db.config.js';

// get all comments from an occurrence
export const getCommentsByOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        const comments = await Comment.findAll({
            where: { occurrence_id },
            order: [['creation_date', 'ASC']] 
        });

        return res.status(200).json(comments);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao listar comentários." });
    }
}

// create a comment
export const createComment = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;
        const { content } = req.body;
        const userId = req.loggedUser.user_id;

        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "O conteúdo do comentário é obrigatório." });
        }

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        // REGRA DO ENUNCIADO: Só pode comentar em ocorrências NÃO resolvidas
        // Assumindo que o status_id da ocorrência "resolvida" é 4 (ajusta se for outro id na tua BD)
        if (occurrence.status_id === 4) {
            return res.status(400).json({ message: "Não é possível comentar em ocorrências já resolvidas." });
        }

        const newComment = await Comment.create({
            occurrence_id,
            user_id: userId,
            content: content.trim(),
            creation_date: new Date()
        });

        return res.status(201).json({
            message: "Comentário adicionado com sucesso!",
            comment: newComment
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao criar comentário." });
    }
};

// mark a comment as inappropriate
export const flagComment = async (req, res, next) => {
    try {
        const { comment_id } = req.params;
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        const comment = await Comment.findByPk(comment_id);
        if (!comment) {
            return res.status(404).json({ message: "Comentário não encontrado." });
        }

        // REGRA DO ENUNCIADO: Funcionários e Admins podem sinalizar tudo.
        // Utilizador comum só sinaliza se for na ocorrência que ELE PRÓPRIO criou.
        if (profileType !== 'admin' && profileType !== 'funcionario') {
            const occurrence = await Occurrence.findByPk(comment.occurrence_id);
            
            if (occurrence.user_id !== userId) {
                return res.status(403).json({ 
                    message: "Acesso proibido. Apenas podes sinalizar comentários nas ocorrências que tu criaste." 
                });
            }
        }

        await comment.update({ is_inappropriate: true });

        return res.status(200).json({ 
            message: "Comentário sinalizado como indevido com sucesso. Será revisto pelo Administrador.", 
            comment 
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao sinalizar comentário." });
    }
}

// delete a comment (Only Admin)
export const deleteComment = async (req, res, next) => {
    try {
        const { comment_id } = req.params;
        const profileType = req.loggedUser.profile_type;

        if (profileType !== 'admin') {
            return res.status(403).json({ message: "Acesso proibido. Apenas Administradores podem remover comentários." });
        }

        const comment = await Comment.findByPk(comment_id);
        if (!comment) {
            return res.status(404).json({ message: "Comentário não encontrado." });
        }

        await comment.destroy();

        return res.status(200).json({ message: "Comentário removido pelo Administrador com sucesso!" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao eliminar comentário." });
    }
}