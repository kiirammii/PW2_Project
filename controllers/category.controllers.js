import { Category, Occurrence } from '../models/db.config.js';

// ==========================================
// Retrieve all Categories
// ==========================================
export const getAllCategory = async (req, res, next) => {
    try {
        const categories = await Category.findAll();
        return res.status(200).json(categories);
    } catch (error) {
        console.error("Error in getAllCategory:", error);
        return res.status(500).json({ message: "Error listing categories." });
    }
}

// ==========================================
// Create a New Category 
// ==========================================
export const createCategory = async (req, res, next) => {
    try {
        const { category_name } = req.body;

        // check if logged-in user is an admin
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can create categories." });
        }

        // category name must be a valid text string
        if (category_name !== undefined && typeof category_name !== 'string') {
            return res.status(400).json({ message: "The category name must be a valid text string." });
        }

        // avoid creating categories with empty or whitespace-only names
        if (!category_name || category_name.trim() === "") {
            return res.status(400).json({ message: "The category name is required and cannot be empty." });
        }

        const cleanName = category_name.trim();

        // avoid creating duplicate categories with the same name
        const categoryExists = await Category.findOne({ where: { category_name: cleanName } });
        if (categoryExists) {
            return res.status(409).json({ message: `A category with this name (${cleanName}) already exists.` });
        }

        const newCategory = await Category.create({ category_name: cleanName });
        
        return res.status(201).json({
            message: "Category created successfully!",
            category: newCategory
        });

    } catch (error) {
        console.error("Error in createCategory:", error);
        return res.status(500).json({ message: "Error creating category." });
    }
}

// ==========================================
// Edit a Category
// ==========================================
export const updateCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;
        const { category_name } = req.body;

        // check if logged-in user is an admin
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can update categories." });
        }

        // convert category_id to a number before querying the database
        const numericCategoryId = parseInt(category_id, 10);
        if (isNaN(numericCategoryId)) {
            return res.status(400).json({ message: "The category ID must be a valid number." });
        }

        // category name must be a valid text string
        if (!category_name || typeof category_name !== 'string' || category_name.trim() === "") {
            return res.status(400).json({ message: "The new category name is required and must be text." });
        }
        
        const category = await Category.findByPk(numericCategoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        const cleanName = category_name.trim();

        // check for name conflicts with other categories (excluding the current category)
        const nameConflict = await Category.findOne({ where: { category_name: cleanName } });
        // Ajustada a comparação de IDs de forma numérica pura
        if (nameConflict && nameConflict.category_id !== numericCategoryId) {
            return res.status(409).json({ message: "Another category with this name already exists." });
        }

        category.category_name = cleanName;
        await category.save();

        return res.status(200).json({
            message: "Category updated successfully!",
            category
        });

    } catch (error) {
        console.error("Error in updateCategory:", error);
        return res.status(500).json({ message: "Error updating category." });
    }
}

// ==========================================
// Delete a Category
// ==========================================
export const deleteCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;

        // check if logged-in user is an admin
        if (req.loggedUser?.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can delete categories." });
        }

        // convert category_id to a number before querying the database
        const numericCategoryId = parseInt(category_id, 10);
        if (isNaN(numericCategoryId)) {
            return res.status(400).json({ message: "The category ID must be a valid number." });
        }

        const category = await Category.findByPk(numericCategoryId);
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        // Prevent deleting categories that are still referenced by occurrences.
        const associatedOccurrences = await Occurrence.count({ where: { category_id: numericCategoryId } });
        if (associatedOccurrences) {
            return res.status(409).json({
                message: "Cannot delete category. There are existing occurrences associated with it."
            });
        }

        await category.destroy();
        return res.status(200).json({ message: "Category deleted successfully!" });
    } catch (error) {
        console.error("Error in deleteCategory:", error);
        return res.status(500).json({ 
            message: "Error deleting category." 
        });
    }
}