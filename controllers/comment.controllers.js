import { Comment, Occurrence } from '../models/db.config.js';

// get all comments from an occurrence
export const getCommentsByOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        // --- CONVERSÃO EXPLICITA PARA NÚMERO ---
        const numericOccurrenceId = parseInt(occurrence_id, 10);

        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "The provided occurrence ID must be a valid number." });
        }
        // ----------------------------------------

        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        const comments = await Comment.findAll({
            where: { occurrence_id: numericOccurrenceId },
            order: [['creation_date', 'ASC']] 
        });

        return res.status(200).json(comments);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error listing comments." });
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

        // --- CONVERSÃO EXPLICITA PARA NÚMEROS ---
        const numericOccurrenceId = parseInt(occurrence_id, 10);
        const numericCommentId = parseInt(comment_id, 10);

        if (isNaN(numericOccurrenceId) || isNaN(numericCommentId)) {
            return res.status(400).json({ message: "The provided IDs must be valid numbers." });
        }
        // ----------------------------------------

        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        const comment = await Comment.findByPk(numericCommentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        if (comment.occurrence_id !== numericOccurrenceId) {
            return res.status(404).json({ message: "Comment not found in this occurrence." });
        }

        // REGRA DO ENUNCIADO: Funcionários e Admins podem sinalizar tudo.
        // Utilizador comum só sinaliza se for na ocorrência que ELE PRÓPRIO criou.
        if (profileType !== 'admin' && profileType !== 'funcionario') {
            if (occurrence.user_id !== userId) {
                return res.status(403).json({ 
                    message: "Access denied. You can only flag comments in occurrences you created." 
                });
            }
        }

        await comment.update({ is_inappropriate: true });

        return res.status(200).json({ 
            message: "Comment flagged as inappropriate successfully. It will be reviewed by the Administrator.", 
            comment 
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error flagging comment." });
    }
}

// delete a comment (Only Admin)
export const deleteComment = async (req, res, next) => {
    try {
        const { occurrence_id, comment_id } = req.params;
        const profileType = req.loggedUser.profile_type;

        if (profileType !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only Administrators can remove comments." });
        }

        // --- CONVERSÃO EXPLICITA PARA NÚMEROS ---
        const numericOccurrenceId = parseInt(occurrence_id, 10);
        const numericCommentId = parseInt(comment_id, 10);

        if (isNaN(numericOccurrenceId) || isNaN(numericCommentId)) {
            return res.status(400).json({ message: "The provided IDs must be valid numbers." });
        }
        // ----------------------------------------

        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        const comment = await Comment.findByPk(numericCommentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        if (comment.occurrence_id !== numericOccurrenceId) {
            return res.status(404).json({ message: "Comment not found in this occurrence." });
        }

        await comment.destroy();

        return res.status(200).json({ message: "Comment removed by Administrator successfully!" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error removing comment." });
    }
}