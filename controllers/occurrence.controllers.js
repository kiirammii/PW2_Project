import { Occurrence, StatusHistory, OccurrencePhoto} from '../models/db.config.js';

// get all occurrences (Com Estatísticas Globais embutidas para Admin/Funcionário)
export const getAllOccurrences = async (req, res, next) => {
    try {
        const userId = req.loggedUser.user_id;
        const profileType = req.loggedUser.profile_type;

        let occurrences = await Occurrence.findAll();

        // 🌟 SE FOR ADMIN OU FUNCIONÁRIO: Calculamos as estatísticas globais automaticamente
        if (profileType === 'admin' || profileType === 'funcionario') {
            
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

        // Se for um utilizador normal, recebe apenas a lista simples (sem estatísticas globais)
        return res.status(200).json(occurrences);

    } catch (error) {
        return res.status(500).json({ message: error.message || "Erro ao listar ocorrências." });
    }
}

// get one occurrence
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
        const { description, category_id, building_zone, latitude, longitude } = req.body;

        // VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS DO TEU MODELO
        const errors = [];
        if (!description || description.trim() === "") errors.push({ field: "description", message: "A descrição é obrigatória." });
        if (!category_id) errors.push({ field: "category_id", message: "A categoria é obrigatória." });
        if (!building_zone || building_zone.trim() === "") errors.push({ field: "building_zone", message: "A zona do edifício é obrigatória." });
        if (latitude === undefined || latitude === null) errors.push({ field: "latitude", message: "A latitude é obrigatória." });
        if (longitude === undefined || longitude === null) errors.push({ field: "longitude", message: "A longitude é obrigatória." });

        // Validação estrita do ENUM das zonas do edifício conforme o teu modelo
        const allowedZones = ['Bloco A', 'Bloco B', 'Bloco C', 'Bloco D', 'Bloco E', 'Bloco F', 'Bloco G'];
        if (building_zone && !allowedZones.includes(building_zone)) {
            errors.push({ field: "building_zone", message: "Zona do edifício inválida. Escolha entre Bloco A e Bloco G." });
        }

        if (errors.length > 0) {
            return res.status(400).json({ 
                message: "Dados de entrada inválidos", 
                errors: errors 
            });
        }

        const userId = req.loggedUser.user_id; 

        const newOccurrence = await Occurrence.create({
            description,
            category_id,
            building_zone, 
            latitude,
            longitude,
            user_id: userId,
            status_id: 1,    
            priority: 'Low'  
        });

        // ✨ HISTÓRICO AUTOMÁTICO: Corrigido para "procedure_description" para bater certo com o teu modelo
        await StatusHistory.create({
            occurrence_id: newOccurrence.occurrence_id, 
            status_id: 1,
            procedure_description: "Ocorrência submetida pelo utilizador.",
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

            // ✨ HISTÓRICO AUTOMÁTICO: Corrigido para "procedure_description" conforme o teu modelo
            await StatusHistory.create({
                occurrence_id: occurrence.occurrence_id,
                status_id: occurrence.status_id,
                procedure_description: `Atualizado por ${profileType}. Estado: ${oldStatus} -> ${occurrence.status_id}. Prioridade: ${oldPriority} -> ${occurrence.priority}`,
                change_date: new Date()
            });

            return res.status(200).json({ message: "Tratamento da ocorrência registado com sucesso!", occurrence });
        } 
        
        // 2. REGRAS PARA UTILIZADOR COMUM (Estudante/Docente)
        else {
            if (occurrence.user_id !== userId) {
                return res.status(403).json({ message: "Acesso proibido. Não podes editar ocorrências de outros." });
            }

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

        if (profileType === 'admin') {
            await occurrence.destroy();
            return res.status(200).json({ message: "Ocorrência removida pelo Administrador com sucesso!" });
        }

        if (profileType === 'funcionario') {
            return res.status(403).json({ message: "Acesso proibido. Os funcionários apenas podem tratar ocorrências, não as eliminar." });
        }

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
            photo_url: `${req.file.path}`, // Injeta perfeitamente o link seguro da Cloud
            upload_date: new Date() 
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