import { Category } from '../models/db.config.js';

// get all categories
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

        // Proteção extra no controlador
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can create categories." });
        }

        // Validação com trim() para evitar nomes vazios ou cheios de espaços
        if (!category_name || category_name.trim() === "") {
            return res.status(400).json({ message: "The category name is required and cannot be empty." });
        }

        const cleanName = category_name.trim();

        // Evitar categorias duplicadas com o mesmo nome
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

// update a category
export const updateCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;
        const { category_name } = req.body;

        // Proteção extra no controlador
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can update categories." });
        }

        if (!category_name || category_name.trim() === "") {
            return res.status(400).json({ message: "The new category name is required." });
        }

        const category = await Category.findByPk(category_id);
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        const cleanName = category_name.trim();

        // Verificar se já existe OUTRA categoria com esse nome para não gerar conflitos
        const nameConflict = await Category.findOne({ where: { category_name: cleanName } });
        if (nameConflict && String(nameConflict.category_id) !== String(category_id)) {
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

// delete a category
export const deleteCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;

        // Proteção extra no controlador
        if (req.loggedUser.profile_type !== 'admin') {
            return res.status(403).json({ message: "Access denied. Only administrators can delete categories." });
        }

        const category = await Category.findByPk(category_id);
        if (!category) {
            return res.status(404).json({ message: "Category not found." });
        }

        await category.destroy();
        return res.status(200).json({ message: "Category deleted successfully!" });
    } catch (error) {
        console.error("Error in deleteCategory:", error);
        // Resposta inteligente caso o MySQL bloqueie a eliminação por haver chaves estrangeiras ativas
        return res.status(500).json({ 
            message: "Error deleting category. Make sure it is not associated with any existing occurrences." 
        });
    }
}