import { Category } from '../models/db.config.js';

// get all cateogries
export const getAllCategory = async (req, res, next) => {
    try {
        const categories = await Category.findAll();
        return res.status(200).json(categories);
    } catch (error) {
        console.error("Erro no getAllCategory:", error);
        return res.status(500).json({ message: "Erro ao listar categorias." });
    }
}

// create a new category
export const createCategory = async (req, res, next) => {
    try {
        const { category_name } = req.body;

        if (!category_name) {
            return res.status(400).json({ message: "O nome da categoria é obrigatório." });
        }

        // Evitar categorias duplicadas com o mesmo nome
        const categoryExists = await Category.findOne({ where: { category_name } });
        if (categoryExists) {
            return res.status(409).json({ message: "Já existe uma categoria com este nome." });
        }

        const newCategory = await Category.create({ category_name });
        
        return res.status(201).json({
            message: "Categoria criada com sucesso!",
            category: newCategory
        });
    } catch (error) {
        console.error("Erro no createCategory:", error);
        return res.status(500).json({ message: "Erro ao criar categoria." });
    }
}

// update a category
export const updateCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;
        const { category_name } = req.body;

        if (!category_name) {
            return res.status(400).json({ message: "O novo nome da categoria é obrigatório." });
        }

        const category = await Category.findByPk(category_id);
        if (!category) {
            return res.status(404).json({ message: "Categoria não encontrada." });
        }

        category.category_name = category_name;
        await category.save();

        return res.status(200).json({
            message: "Categoria atualizada com sucesso!",
            category
        });
    } catch (error) {
        console.error("Erro no updateCategory:", error);
        return res.status(500).json({ message: "Erro ao atualizar categoria." });
    }
}

// delete a category
export const deleteCategory = async (req, res, next) => {
    try {
        const { category_id } = req.params;

        const category = await Category.findByPk(category_id);
        if (!category) {
            return res.status(404).json({ message: "Categoria não encontrada." });
        }

        await category.destroy();
        return res.status(200).json({ message: "Categoria eliminada com sucesso!" });
    } catch (error) {
        console.error("Erro no deleteCategory:", error);
        return res.status(500).json({ message: "Erro ao eliminar categoria. Certifica-te de que não está associada a nenhuma ocorrência." });
    }
}