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

        if (!status_name) {
            return res.status(400).json({ message: "The status name is required." });
        }

        // Evitar statuses duplicados com o mesmo nome
        const statusExists = await Status.findOne({ where: { status_name } });
        if (statusExists) {
            return res.status(409).json({ message: `A status with this name (${status_name}) already exists.` });
        }

        const newStatus = await Status.create({ status_name });
        
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

        if (!status_name) {
            return res.status(400).json({ message: "The new status name is required." });
        }

        const status = await Status.findByPk(status_id);
        if (!status) {
            return res.status(404).json({ message: "Status not found." });
        }

        status.status_name = status_name;
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

        const status = await Status.findByPk(status_id);
        if (!status) {
            return res.status(404).json({ message: "Status not found." });
        }

        await status.destroy();
        return res.status(200).json({ message: "Status deleted successfully!" });
    } catch (error) {
        console.error("Error in deleteStatus:", error);
        return res.status(500).json({ message: "Error deleting status. Make sure it is not associated with any occurrences." });
    }
}