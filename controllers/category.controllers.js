import { Category } from '../models/db.config.js';

// get all cateogries
export const getAllCategory = async (req, res, next) => {
    try {
        const categories = await Category.findAll();
        return res.status(200).json(categories);
    } catch (error) {
        console.error("Error in getAllCategory:", error);
        return res.status(500).json({ message: "Error listing categories." });
    }
}

// create a new category
export const createCategory = async (req, res, next) => {
    try {
        const { category_name } = req.body;

        if (!category_name) {
            return res.status(400).json({ message: "The category name is required." });
        }

        // Evitar categorias duplicadas com o mesmo nome
        const categoryExists = await Category.findOne({ where: { category_name } });
        if (categoryExists) {
            return res.status(409).json({ message: `A category with this name (${category_name}) already exists.` });
        }

        const newCategory = await Category.create({ category_name });
        
        return res.status(201).json({
            message: "Category created successfully!",
            category: newCategory
        });
    } catch (error) {
        console.error("Error in createCategory:", error);
        return res.status(500).json({ message: "Error creating category." });
    }
}

// update a category
export const updateCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;
        const { category_name } = req.body;

        if (!category_name) {
            return res.status(400).json({ message: "The new category name is required." });
        }

        const category = await Category.findByPk(category_id);
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        category.category_name = category_name;
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

// delete a category
export const deleteCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;

        const category = await Category.findByPk(category_id);
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        await category.destroy();
        return res.status(200).json({ message: "Category deleted successfully!" });
    } catch (error) {
        console.error("Error in deleteCategory:", error);
        return res.status(500).json({ message: "Error deleting category. Make sure it is not associated with any occurrences." });
    }
}