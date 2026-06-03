import { Comment, Occurrence } from '../models/db.config.js';

// get all comments from an occurrence
export const getCommentsByOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

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
        const { content } = req.body || {};
        const userId = req.loggedUser.user_id;
        
        // 1. CONVERTE EXPLICITAMENTE PARA NÚMERO INTEIRO
        const numericOccurrenceId = parseInt(occurrence_id, 10);

        // Se por acaso não for um número válido (ex: mandaram "abc" no URL)
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "Occurrence ID must be a valid number." });
        }

        // 2. BUSCA NA BD USANDO O ID JÁ CONVERTIDO PARA NÚMERO
        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        // 3. VALIDAÇÕES DO CONTEÚDO
        if (content !== undefined && typeof content !== 'string') {
            return res.status(400).json({ message: "The comment content must be a valid text." });
        }

        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "The comment content is required." });
        }
        
        if (occurrence.status_id === 4) {
            return res.status(400).json({ message: "You can't comment on already resolved occurrences." });
        }

        // 4. CRIAÇÃO DO COMENTÁRIO
        const newComment = await Comment.create({
            occurrence_id: numericOccurrenceId, // Usa o número aqui também
            user_id: userId,
            content: content.trim(),
            creation_date: new Date()
        });

        return res.status(201).json({
            message: "Comment added successfully!",
            comment: newComment
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error creating comment." });
    }
};

// mark a comment as inappropriate
export const flagComment = async (req, res, next) => {
    try {
        const { occurrence_id, comment_id } = req.params;
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        const comment = await Comment.findByPk(comment_id);
        if (!comment) {
            return res.status(404).json({ message: "Comentário não encontrado." });
        }

        if (comment.occurrence_id !== Number(occurrence_id)) {
            return res.status(404).json({ message: "Comentário não encontrado nesta ocorrência." });
        }

        // REGRA DO ENUNCIADO: Funcionários e Admins podem sinalizar tudo.
        // Utilizador comum só sinaliza se for na ocorrência que ELE PRÓPRIO criou.
        if (profileType !== 'admin' && profileType !== 'funcionario') {
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
        const { occurrence_id, comment_id } = req.params;
        const profileType = req.loggedUser.profile_type;

        if (profileType !== 'admin') {
            return res.status(403).json({ message: "Acesso proibido. Apenas Administradores podem remover comentários." });
        }

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        const comment = await Comment.findByPk(comment_id);
        if (!comment) {
            return res.status(404).json({ message: "Comentário não encontrado." });
        }

        if (comment.occurrence_id !== Number(occurrence_id)) {
            return res.status(404).json({ message: "Comentário não encontrado nesta ocorrência." });
        }

        await comment.destroy();

        return res.status(200).json({ message: "Comentário removido pelo Administrador com sucesso!" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao eliminar comentário." });
    }
}