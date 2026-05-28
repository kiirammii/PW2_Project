import { Status } from "../models/db.config.js";

// get all statuses
export const getAllStatus = async (req, res, next) => {
    try {
        const statuses = await Status.findAll();
        return res.status(200).json(statuses);
    } catch (error) {
        console.error("Error in getAllStatus:", error);
        return res.status(500).json({ message: "Error listing statuses." });
    }
}

// create a new status
export const createStatus = async (req, res, next) => {
    try {
        const { status_name } = req.body;

        // Proteção extra no controlador
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can create statuses." });
        }

        // Validação com trim() para evitar nomes vazios
        if (!status_name || status_name.trim() === "") {
            return res.status(400).json({ message: "The status name is required and cannot be empty." });
        }

        const cleanName = status_name.trim();

        // Evitar statuses duplicados com o mesmo nome
        const statusExists = await Status.findOne({ where: { status_name: cleanName } });
        if (statusExists) {
            return res.status(409).json({ message: `A status with this name (${cleanName}) already exists.` });
        }

        const newStatus = await Status.create({ status_name: cleanName });
        
        return res.status(201).json({
            message: "Status created successfully!",
            status: newStatus
        });
    } catch (error) {
        console.error("Error in createStatus:", error);
        return res.status(500).json({ message: "Error creating status." });
    }
}

// update a status
export const updateStatus = async (req, res, next) => {
    try {
        const { status_id } = req.params;
        const { status_name } = req.body;

        // Proteção extra no controlador
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can update statuses." });
        }

        if (!status_name || status_name.trim() === "") {
            return res.status(400).json({ message: "The new status name is required." });
        }

        const status = await Status.findByPk(status_id);
        if (!status) {
            return res.status(404).json({ message: "Status not found." });
        }

        const cleanName = status_name.trim();

        // Verificar se já existe OUTRO estado com esse nome
        const nameConflict = await Status.findOne({ where: { status_name: cleanName } });
        if (nameConflict && String(nameConflict.status_id) !== String(status_id)) {
            return res.status(409).json({ message: "Another status with this name already exists." });
        }

        status.status_name = cleanName;
        await status.save();

        return res.status(200).json({
            message: "Status updated successfully!",
            status
        });
    } catch (error) {
        console.error("Error in updateStatus:", error);
        return res.status(500).json({ message: "Error updating status." });
    }
}

// delete a status
export const deleteStatus = async (req, res, next) => {
    try {
        const { status_id } = req.params;

        // Proteção extra no controlador
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can delete statuses." });
        }

        const status = await Status.findByPk(status_id);
        if (!status) {
            return res.status(404).json({ message: "Status not found." });
        }

        await status.destroy();
        return res.status(200).json({ message: "Status deleted successfully!" });
    } catch (error) {
        console.error("Error in deleteStatus:", error);
        return res.status(500).json({ 
            message: "Error deleting status. Make sure it is not associated with any occurrences or status history." 
        });
    }
}