import { Category, Occurrence, StatusHistory, OccurrencePhoto} from '../models/db.config.js';
import { v2 as cloudinary } from 'cloudinary';

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

            // calculate the count of occurrences by priority level
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

        // convert occurrence_id to a number before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "The provided occurrence ID must be a valid number." });
        }

        const occurrence = await Occurrence.findByPk(numericOccurrenceId, {
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
        if (!description || typeof description !== 'string' || description.trim() === "") errors.push({ field: "description", message: "Description is required." });
        if (!category_id) errors.push({ field: "category_id", message: "Category is required." });
        if (!building_zone || typeof building_zone !== 'string' || building_zone.trim() === "") errors.push({ field: "building_zone", message: "Building zone is required." });
        if (latitude === undefined || latitude === null) errors.push({ field: "latitude", message: "Latitude is required." });
        if (longitude === undefined || longitude === null) errors.push({ field: "longitude", message: "Longitude is required." });

        // validate data types with clear error messages
        const numericCategoryId = parseInt(category_id, 10);
        if (isNaN(numericCategoryId)) {
            errors.push({ field: "category_id", message: "Category ID must be a valid number." });
        } else {
            const category = await Category.findByPk(numericCategoryId);
            if (!category) {
                return res.status(404).json({ message: "This category does not exist." });
            }
        }

        // validate latitude and longitude as numbers with clear error messages
        if ((latitude !== undefined && latitude !== null) && isNaN(Number(latitude))) {
            errors.push({ field: "latitude", message: "Latitude must be a valid number." });
        }

        // validate longitude and latitude ranges with clear error messages
        if ((longitude !== undefined && longitude !== null) && isNaN(Number(longitude))) {
            errors.push({ field: "longitude", message: "Longitude must be a valid number." });
        }

        // validate building_zone against allowed values with a clear error message
        const allowedZones = ['Bloco A', 'Bloco B', 'Bloco C', 'Bloco D', 'Bloco E', 'Bloco F', 'Bloco G'];
        if (building_zone && typeof building_zone === 'string' && !allowedZones.includes(building_zone.trim())) {
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
            description: description.trim(),
            category_id: numericCategoryId,
            building_zone: building_zone.trim(), 
            latitude: Number(latitude),
            longitude: Number(longitude),
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

        // convert occurrence_id to a number before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "The provided occurrence ID must be a valid number." });
        }

        const occurrence = await Occurrence.findByPk(numericOccurrenceId);

        // check if the occurrence exists
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

            // only the creator of the occurrence can edit it, and only if it's still in "Submetida" status (status_id = 1)
            if (occurrence.user_id !== userId) {
                return res.status(403).json({ message: "Access denied. You cannot edit occurrences submitted by others." });
            }

            // users cannot edit occurrences that are already being processed by staff (status_id different from 1)
            if (occurrence.status_id !== 1) {
                return res.status(400).json({ message: "You cannot modify an occurrence that is already being processed by a staff member." });
            }

            // prevent trim crash if field is passed as empty or incorrect type
            if (description !== undefined && (typeof description !== 'string' || description.trim() === "")) {
                return res.status(400).json({ message: "Description cannot be empty." });
            }

            await occurrence.update({
                description: description ? description.trim() : occurrence.description,
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

        // convert occurrence_id to a number before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "The provided occurrence ID must be a valid number." });
        }

        const occurrence = await Occurrence.findByPk(numericOccurrenceId);

        // check if the occurrence exists
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        // for admin users: they can delete any occurrence
        if (profileType === 'admin') {
            await occurrence.destroy();
            return res.status(200).json({ message: "Occurrence removed by Administrator successfully!" });
        }

        // for staff users: they cannot delete occurrences, only handle them (change status and priority)
        if (profileType === 'staff') {
            return res.status(403).json({ message: "Access denied. Staff members can only handle occurrences, not delete them." });
        }

        // for normal users: they can only delete their own occurrences
        if (occurrence.user_id !== userId) {
            return res.status(403).json({ message: "Access denied. You cannot delete an occurrence that is not yours." });
        }

        // users cannot delete occurrences that are already being processed by staff (status_id different from 1)
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

        // convert occurrence_id to a number before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);

        // validate that occurrence_id is a valid number
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "The provided occurrence ID must be a valid number." });
        }

        // check if the occurrence exists before trying to fetch photos
        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        const photos = await OccurrencePhoto.findAll({
            where: { occurrence_id: numericOccurrenceId }
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
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        // convert occurrence_id to a number before querying the database
        const numericOccurrenceId = parseInt(occurrence_id, 10);

        // validate that occurrence_id is a valid number
        if (isNaN(numericOccurrenceId)) {
            return res.status(400).json({ message: "The provided occurrence ID must be a valid number." });
        }

        const occurrence = await Occurrence.findByPk(numericOccurrenceId);
        if (!occurrence) {
            return res.status(404).json({ message: "Occurrence not found." });
        }

        // cannot upload photos to occurrences that are already resolved (status_id = 4)
        if (occurrence.status_id === 4) {
            return res.status(400).json({ 
                message: "Cannot add photos to an occurrence that has already been resolved." 
            });
        }

        // if the user is not an admin, they can only upload photos to occurrences they created
        if (profileType !== 'admin' && occurrence.user_id !== userId) {
            return res.status(403).json({ 
                message: "Access denied. You can only upload photos to occurrences you created." 
            });
        }

        // if no file was uploaded, return an error
        if (!req.file) {
            return res.status(400).json({ message: "Please select a file." });
        }

        const newPhoto = await OccurrencePhoto.create({
            occurrence_id: numericOccurrenceId,
            photo_url: req.file.path,
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
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        // convert photo_id to a number before querying the database
        const numericPhotoId = parseInt(photo_id, 10);
        if (isNaN(numericPhotoId)) {
            return res.status(400).json({ message: "The provided photo ID must be a valid number." });
        }

        // find the photo to get the associated occurrence_id and photo_url
        const photo = await OccurrencePhoto.findByPk(numericPhotoId);
        if (!photo) {
            return res.status(404).json({ message: "Photo not found." });
        }

        // ensure the associated occurrence exists before proceeding
        const occurrence = await Occurrence.findByPk(photo.occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Associated occurrence not found." });
        }

        // cannot delete photos from occurrences that are already resolved (status_id = 4), even for admins
        if (occurrence.status_id === 4 && profileType !== 'admin') {
            return res.status(400).json({ 
                message: "Cannot delete photos from an occurrence that has already been resolved." 
            });
        }

        // only the creator of the occurrence or an admin can delete a photo
        if (profileType !== 'admin' && occurrence.user_id !== userId) {
            return res.status(403).json({ 
                message: "Access denied. You can only delete photos from occurrences you created." 
            });
        }

        // delete the photo from Cloudinary using the public ID extracted from the photo URL
        try {
            const urlParts = photo.photo_url.split('/');
            const folderName = 'occurrence_photos';
            const fileWithName = urlParts[urlParts.length - 1];
            const publicId = `${folderName}/${fileWithName.split('.')[0]}`;
            
            await cloudinary.uploader.destroy(publicId);
        } catch (cloudinaryError) {
            console.error("Failed to delete image from Cloudinary:", cloudinaryError);
        }

        // delete the photo record from the database
        await photo.destroy();

        return res.status(200).json({ message: "Photo deleted successfully!" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error deleting photo." });
    }
}