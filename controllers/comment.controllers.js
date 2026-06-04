import { Comment, Occurrence } from '../models/db.config.js';

// ==========================================
// Get all Comments for a specific Occurrence
// ==========================================
export const getCommentsByOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        // convert occurrence_id to a number before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);

        // if occurrence_id is not a valid number, return an error
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "The provided occurrence ID must be a valid number." });
        }

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

// ==========================================
// Create a Comment
// ==========================================
export const createComment = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;
        const { content } = req.body || {};
        const userId = req.loggedUser.user_id;
        
        // convert occurrence_id to a number before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);

        // if occurrence_id is not a valid number, return an error
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "Occurrence ID must be a valid number." });
        }

        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        // comment content must be a valid text string
        if (content !== undefined && typeof content !== 'string') {
            return res.status(400).json({ message: "The comment content must be a valid text." });
        }

        // avoid creating comments with empty or whitespace-only content
        if (!content || content.trim() === "") {
            return res.status(400).json({ message: "The comment content is required." });
        }
        
        // comments cannot be added to occurrences that are already resolved (status_id = 4)
        if (occurrence.status_id === 4) {
            return res.status(400).json({ message: "You can't comment on already resolved occurrences." });
        }

        // create the comment with the numeric occurrence ID
        const newComment = await Comment.create({
            occurrence_id: numericOccurrenceId,
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


// ==========================================
// Mark a Comment as Inappropriate (Flag)
// ==========================================
export const flagComment = async (req, res, next) => {
    try {
        const { occurrence_id, comment_id } = req.params;
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        // convert occurrence_id and comment_id to numbers before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);
        const numericCommentId = parseInt(comment_id, 10);

        // if either ID is not a valid number, return an error
        if (isNaN(numericOccurrenceId) || isNaN(numericCommentId)) {
            return res.status(400).json({ message: "The provided IDs must be valid numbers." });
        }

        // check if the occurrence exists
        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        // check if the comment exists
        const comment = await Comment.findByPk(numericCommentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found." });
        }

        // check if the comment belongs to the specified occurrence
        if (comment.occurrence_id !== numericOccurrenceId) {
            return res.status(404).json({ message: "Comment not found in this occurrence." });
        }

        // if the user is not an admin or staff, they can only flag their own comments or comments on occurrences they created
        if (profileType !== 'admin' && profileType !== 'staff') {
            if (comment.user_id !== userId && occurrence.user_id !== userId) {
                return res.status(403).json({ 
                    message: "Access denied. You can only flag your own comments or comments on occurrences you created." 
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

// ==========================================
// Delete a Comment
// ==========================================
export const deleteComment = async (req, res, next) => {
    try {
        const { occurrence_id, comment_id } = req.params;
        const profileType = req.loggedUser.profile_type;

        // only users with 'admin' profile can delete comments
        if (profileType !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only Administrators can remove comments." });
        }

        // convert occurrence_id and comment_id to numbers before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);
        const numericCommentId = parseInt(comment_id, 10);

        // if either ID is not a valid number, return an error
        if (isNaN(numericOccurrenceId) || isNaN(numericCommentId)) {
            return res.status(400).json({ message: "The provided IDs must be valid numbers." });
        }

        // check if the occurrence exists
        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        // check if the comment exists
        const comment = await Comment.findByPk(numericCommentId);
        if (!comment) {
            return res.status(404).json({ message: "Comment not found." });
        }
        
        // check if the comment belongs to the specified occurrence
        if (comment.occurrence_id !== numericOccurrenceId) {
            return res.status(404).json({ message: "Comment not found in this occurrence." });
        }

        await comment.destroy();

        return res.status(200).json({ message: "Comment removed by Administrator successfully!" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error removing comment." });
    }
}