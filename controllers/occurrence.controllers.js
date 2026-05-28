import { Occurrence, StatusHistory, OccurrencePhoto} from '../models/db.config.js';

// get all occurrences
export const getAllOccurrences = async (req, res, next) => {
    try {
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        let occurrences;

        // Se for admin ou funcionário, vê todas as ocorrências do sistema
        if (profileType === 'admin' || profileType === 'funcionario') {
            occurrences = await Occurrence.findAll();
        } else {
            // Se for utilizador normal (estudante/docente), vê todas as ocorrências da escola
            occurrences = await Occurrence.findAll();
            // occurrences = await Occurrence.findAll({ where: { user_id: userId } });
        }

        return res.status(200).json(occurrences);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao listar ocorrências." });
    }
}

// get one occurrence
export const getOneOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        // Puxa a ocorrência e inclui o histórico automático conforme o teu db.config
        const occurrence = await Occurrence.findByPk(occurrence_id, {
            include: [{
                model: StatusHistory
            }, {
                model: OccurrencePhoto
            }]
        });

        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        return res.status(200).json(occurrence);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao buscar ocorrência." });
    }
}

// create an occurrence
export const createOccurrence = async (req, res, next) => {
    try {
        // 1. ADICIONAR OS CAMPOS CORRETOS (Sem title, porque não existe no modelo)
        const { description, category_id, building_zone, latitude, longitude } = req.body;

        // 2. VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS DO TEU MODELO
        const errors = [];
        if (!description || description.trim() === "") errors.push({ field: "description", message: "A descrição é obrigatória." });
        if (!category_id) errors.push({ field: "category_id", message: "A categoria é obrigatória." });
        if (!building_zone || building_zone.trim() === "") errors.push({ field: "building_zone", message: "A zona do edifício é obrigatória." });
        if (latitude === undefined || latitude === null) errors.push({ field: "latitude", message: "A latitude é obrigatória." });
        if (longitude === undefined || longitude === null) errors.push({ field: "longitude", message: "A longitude é obrigatória." });

        if (errors.length > 0) {
            return res.status(400).json({ 
                message: "Dados de entrada inválidos", 
                errors: errors 
            });
        }

        // 3. EXTRAÇÃO DO USER ID DO MIDDLEWARE
        const userId = req.loggedUser.user_id; 

        // 4. CRIAÇÃO REAL CONFORME OS ENUMS E CAMPOS DO TEU MODELO
        const newOccurrence = await Occurrence.create({
            description,
            category_id,
            building_zone, // Tem de ser exatamente 'Bloco A', 'Bloco B', etc.
            latitude,
            longitude,
            user_id: userId,
            status_id: 1,    // 1 por default
            priority: 'low'  // 'low' por default (bate certo com o teu ENUM)
        });

        // ✨ HISTÓRICO AUTOMÁTICO: Regista o nascimento da ocorrência
        await StatusHistory.create({
            occurrence_id: newOccurrence.occurrence_id, 
            status_id: 1,
            notes: "Ocorrência submetida pelo utilizador.",
            change_date: new Date()
        });

        return res.status(201).json({
            message: "Ocorrência criada com sucesso!",
            occurrence: newOccurrence
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro interno ao criar ocorrência" });
    }
};

// update an occurrence
export const updateOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;
        
        const { 
            description, category_id, building_zone, latitude, longitude, 
            status_id, priority, expected_date, resolution_date 
        } = req.body;

        const occurrence = await Occurrence.findByPk(occurrence_id);

        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        // 1. REGRAS PARA FUNCIONÁRIO OU ADMINISTRADOR
        if (profileType === 'funcionario' || profileType === 'admin') {
            const oldStatus = occurrence.status_id;
            const oldPriority = occurrence.priority;

            await occurrence.update({
                status_id: status_id || occurrence.status_id,
                priority: priority || occurrence.priority,
                expected_date: expected_date || occurrence.expected_date,
                resolution_date: resolution_date || occurrence.resolution_date
            });

            // ✨ HISTÓRICO AUTOMÁTICO: Regista a alteração feita pelo Funcionário/Admin
            await StatusHistory.create({
                occurrence_id: occurrence.occurrence_id,
                status_id: occurrence.status_id,
                notes: `Atualizado por ${profileType}. Estado: ${oldStatus} -> ${occurrence.status_id}. Prioridade: ${oldPriority} -> ${occurrence.priority}`,
                change_date: new Date()
            });

            return res.status(200).json({ message: "Tratamento da ocorrência registado com sucesso!", occurrence });
        } 
        
        // 2. REGRAS PARA UTILIZADOR COMUM (Estudante/Docente)
        else {
            // Só pode editar se a ocorrência for dele
            if (occurrence.user_id !== userId) {
                return res.status(403).json({ message: "Acesso proibido. Não podes editar ocorrências de outros." });
            }

            // Só pode editar se ainda NÃO tiver sido tratada (ou seja, ainda está no estado 1)
            if (occurrence.status_id !== 1) {
                return res.status(400).json({ message: "Não podes alterar uma ocorrência que já está em processamento pelo funcionário." });
            }

            await occurrence.update({
                description: description || occurrence.description,
                category_id: category_id || occurrence.category_id,
                building_zone: building_zone || occurrence.building_zone,
                latitude: latitude || occurrence.latitude,
                longitude: longitude || occurrence.longitude
            });

            return res.status(200).json({ message: "A tua ocorrência foi atualizada com sucesso!", occurrence });
        }

    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao atualizar ocorrência." });
    }
}

// delete an occurrence
export const deleteOccurrence = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        const occurrence = await Occurrence.findByPk(occurrence_id);

        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        // 1. SE FOR ADMINISTRADOR: Remove sem restrições
        if (profileType === 'admin') {
            await occurrence.destroy();
            return res.status(200).json({ message: "Ocorrência removida pelo Administrador com sucesso!" });
        }

        // 2. SE FOR FUNCIONÁRIO: Não tem autorização no enunciado para apagar
        if (profileType === 'funcionario') {
            return res.status(403).json({ message: "Acesso proibido. Os funcionários apenas podem tratar ocorrências, não as eliminar." });
        }

        // 3. SE FOR UTILIZADOR COMUM (Estudante/Docente)
        if (occurrence.user_id !== userId) {
            return res.status(403).json({ message: "Acesso proibido. Não podes eliminar uma ocorrência que não te pertence." });
        }

        if (occurrence.status_id !== 1) {
            return res.status(400).json({ message: "Já não podes eliminar esta ocorrência porque ela já está a ser tratada." });
        }

        await occurrence.destroy();
        return res.status(200).json({ message: "A tua ocorrência foi eliminada com sucesso!" });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao eliminar ocorrência." });
    }
}

// get all photos from an occurrence
export const getPhotos = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        // Usamos o modelo que está no teu db.config (ajusta se for com O maiúsculo ou minúsculo)
        const photos = await OccurrencePhoto.findAll({
            where: { occurrence_id }
        });

        return res.status(200).json(photos);
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao obter fotografias." });
    }
}

// upload an occurrence photo
export const uploadPhoto = async (req, res, next) => {
    try {
        const { occurrence_id } = req.params;

        const occurrence = await Occurrence.findByPk(occurrence_id);
        if (!occurrence) {
            return res.status(404).json({ message: "Ocorrência não encontrada." });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Por favor, selecione um ficheiro." });
        }

        const newPhoto = await OccurrencePhoto.create({
            occurrence_id,
            photo_url: `/uploads/${req.file.filename}`,
            upload_date: new Date() // Bate certo com o teu campo upload_date do MySQL!
        });

        return res.status(201).json({
            message: "Fotografia adicionada com sucesso!",
            photo: newPhoto
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao fazer upload." });
    }
}

// delete an occurrence photo
export const deletePhoto = async (req, res, next) => {
    try {
        const { photo_id } = req.params;

        const photo = await OccurrencePhoto.findByPk(photo_id);
        if (!photo) {
            return res.status(404).json({ message: "Fotografia não encontrada." });
        }

        await photo.destroy();
        return res.status(200).json({ message: "Fotografia eliminada com sucesso!" });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao eliminar fotografia." });
    }
}