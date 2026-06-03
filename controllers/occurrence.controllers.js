import { Category, Occurrence, StatusHistory, OccurrencePhoto} from '../models/db.config.js';

// ==========================================
// Retrieve all Occurrences (with statistics for admin and staff users)
// ==========================================
export const getAllOccurrences = async (req, res, next) => {
    try {
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        let occurrences = await Occurrence.findAll();

        // for admin and staff: global statistics calculated automatically
        if (profileType === 'admin' || profileType === 'staff') {
            
            const totalOccurrences = occurrences.length;

            const highPriorityCount = occurrences.filter(o => o.priority === 'High').length;
            const mediumPriorityCount = occurrences.filter(o => o.priority === 'Medium').length;
            const lowPriorityCount = occurrences.filter(o => o.priority === 'Low').length;

            const submittedCount = occurrences.filter(o => o.status_id === 1).length;

            return res.status(200).json({
                statistics: {
                    total: totalOccurrences,
                    by_priority: {
                        high: highPriorityCount,
                        medium: mediumPriorityCount,
                        low: lowPriorityCount
                    },
                    pending_treatment: submittedCount
                },
                occurrences: occurrences 
            });
        }

        // for normal users: receive only the simple list (without global statistics)
        return res.status(200).json(occurrences);

    } catch (error) {
        return res.status(500).json({ message: error.message || "Error while listing occurrences." });
    }
}


// ==========================================
// Retrieve an Occurrence
// ==========================================
export const getOneOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        const occurrence = await Occurrence.findByPk(occurrence_id, {
            include: [{
                model: StatusHistory
            }, {
                model: OccurrencePhoto
            }]
        });

        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        return res.status(200).json(occurrence);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error while fetching occurrence." });
    }
}


// ==========================================
// Create a New Occurrence
// ==========================================
export const createOccurrence = async (req, res, next) => {
    try {
        const { description, category_id, building_zone, latitude, longitude } = req.body;

        // validate mandatory fields with detailed error messages
        const errors = [];
        if (!description || description.trim() === "") errors.push({ field: "description", message: "Description is required." });
        if (!category_id) errors.push({ field: "category_id", message: "Category is required." });
        if (!building_zone || building_zone.trim() === "") errors.push({ field: "building_zone", message: "Building zone is required." });
        if (latitude === undefined || latitude === null) errors.push({ field: "latitude", message: "Latitude is required." });
        if (longitude === undefined || longitude === null) errors.push({ field: "longitude", message: "Longitude is required." });

        // --- NOVAS VALIDAÇÕES DE TIPO DE DADOS ---
        if (category_id && isNaN(Number(category_id))) {
            errors.push({ field: "category_id", message: "Category ID must be a valid number." });
        }

        const category = await Category.findByPk(category_id);
        if (!category) {
            return res.status(404).json({ message: "This category does not exist." });
        }

        if ((latitude !== undefined && latitude !== null) && isNaN(Number(latitude))) {
            errors.push({ field: "latitude", message: "Latitude must be a valid number." });
        }
        if ((longitude !== undefined && longitude !== null) && isNaN(Number(longitude))) {
            errors.push({ field: "longitude", message: "Longitude must be a valid number." });
        }
        // -----------------------------------------

        // validate building_zone against allowed values with a clear error message
        const allowedZones = ['Bloco A', 'Bloco B', 'Bloco C', 'Bloco D', 'Bloco E', 'Bloco F', 'Bloco G'];
        if (building_zone && !allowedZones.includes(building_zone)) {
            errors.push({ field: "building_zone", message: "Invalid building zone. Choose between Bloco A and Bloco G." });
        }

        if (errors.length > 0) {
            return res.status(400).json({ 
                message: "Invalid input data", 
                errors: errors 
            });
        }

        const userId = req.loggedUser.user_id; 

        const newOccurrence = await Occurrence.create({
            description,
            category_id: Number(category_id), // Garante que entra como número
            building_zone, 
            latitude: Number(latitude),       // Garante que entra como número
            longitude: Number(longitude),     // Garante que entra como número
            user_id: userId,
            status_id: 1,    
            priority: 'Low'  
        });

        // automatic status history entry for the new occurrence with a clear description
        await StatusHistory.create({
            occurrence_id: newOccurrence.occurrence_id, 
            status_id: 1,
            procedure_description: "Occurrence submitted by the user.",
            change_date: new Date()
        });

        return res.status(201).json({
            message: "Occurrence created successfully!",
            occurrence: newOccurrence
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Internal server error while creating occurrence" });
    }
};


// ==========================================
// Edit an Occurrence
// ==========================================
export const updateOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;
        
        const bodyData = req.body || {};
        const { 
            description, category_id, building_zone, latitude, longitude, 
            status_id, priority, expected_date, resolution_date 
        } = bodyData;

        const occurrence = await Occurrence.findByPk(occurrence_id);

        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        // for admin and staff
        if (profileType === 'admin' || profileType === 'staff') {
            const oldStatus = occurrence.status_id;
            const oldPriority = occurrence.priority;

            await occurrence.update({
                status_id: status_id || occurrence.status_id,
                priority: priority || occurrence.priority,
                expected_date: expected_date || occurrence.expected_date,
                resolution_date: resolution_date || occurrence.resolution_date
            });

            // automatic status history entry for the updated occurrence with a clear description
            await StatusHistory.create({
                occurrence_id: occurrence.occurrence_id,
                status_id: occurrence.status_id,
                procedure_description: `Updated by ${profileType}. Status: ${oldStatus} -> ${occurrence.status_id}. Priority: ${oldPriority} -> ${occurrence.priority}`,
                change_date: new Date()
            });

            return res.status(200).json({ message: "Occurrence updated successfully!", occurrence });
        } 
        
        // for normal users
        else {
            if (occurrence.user_id !== userId) {
                return res.status(403).json({ message: "Access denied. You cannot edit occurrences submitted by others." });
            }

            if (occurrence.status_id !== 1) {
                return res.status(400).json({ message: "You cannot modify an occurrence that is already being processed by a staff member." });
            }

            await occurrence.update({
                description: description || occurrence.description,
                category_id: category_id || occurrence.category_id,
                building_zone: building_zone || occurrence.building_zone,
                latitude: latitude || occurrence.latitude,
                longitude: longitude || occurrence.longitude
            });

            return res.status(200).json({ message: "Occurrence updated successfully!", occurrence });
        }

    } catch (error) {
        return res.status(500).json({ message: error.message || "Error updating occurrence." });
    }
}


// ==========================================
// Delete an Occurrence
// ==========================================
export const deleteOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        const occurrence = await Occurrence.findByPk(occurrence_id);

        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        if (profileType === 'admin') {
            await occurrence.destroy();
            return res.status(200).json({ message: "Occurrence removed by Administrator successfully!" });
        }

        if (profileType === 'staff') {
            return res.status(403).json({ message: "Access denied. Staff members can only handle occurrences, not delete them." });
        }

        if (occurrence.user_id !== userId) {
            return res.status(403).json({ message: "Access denied. You cannot delete an occurrence that is not yours." });
        }

        if (occurrence.status_id !== 1) {
            return res.status(400).json({ message: "You cannot delete an occurrence that is already being processed by a staff member." });
        }

        await occurrence.destroy();
        return res.status(200).json({ message: "Occurrence deleted successfully!" });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Error deleting occurrence." });
    }
}


// ==========================================
// Get all Photos from an Occurrence
// ==========================================
export const getPhotos = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        const photos = await OccurrencePhoto.findAll({
            where: { occurrence_id }
        });

        return res.status(200).json(photos);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error fetching photos." });
    }
}


// ==========================================
// Upload an Occurrence Photo
// ==========================================
export const uploadPhoto = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Please select a file." });
        }

        const newPhoto = await OccurrencePhoto.create({
            occurrence_id,
            photo_url: `${req.file.path}`,
            upload_date: new Date() 
        });

        return res.status(201).json({
            message: "Photo uploaded successfully!",
            photo: newPhoto
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error uploading photo." });
    }
}


// ==========================================
// Delete an Occurrence Photo
// ==========================================
export const deletePhoto = async (req, res, next) => {
    try {
        const { photo_id } = req.params;

        const photo = await OccurrencePhoto.findByPk(photo_id);
        if (!photo) {
            return res.status(404).json({ message: "Photo not found." });
        }

        await photo.destroy();
        return res.status(200).json({ message: "Photo deleted successfully!" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error deleting photo." });
    }
}