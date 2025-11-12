const {
  getAllTypes,
  getTypeByName,
  createType,
  updateType,
  deleteType,
} = require('../models/InteractionType');
const { handleMongooseError } = require('../utils/errorHandler');

async function listTypes(req, res, next) {
  try {
    const types = await getAllTypes();
    res.json({ types });
  } catch (error) {
    next(error);
  }
}

async function getType(req, res, next) {
  try {
    const { name } = req.params;
    const type = await getTypeByName(name);
    if (!type) {
      return res.status(404).json({ message: 'Interaction type not found' });
    }
    res.json({ type });
  } catch (error) {
    next(error);
  }
}

async function createTypeEndpoint(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const { name, displayName, description, isActive } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Type name is required' });
    }

    if (!displayName || displayName.trim() === '') {
      return res.status(400).json({ message: 'Display name is required' });
    }

    // Check if type already exists
    const existing = await getTypeByName(name);
    if (existing) {
      return res.status(409).json({ message: 'Interaction type with this name already exists' });
    }

    const type = await createType({ name, displayName, description, isActive });
    res.status(201).json({ type });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

async function updateTypeEndpoint(req, res, next) {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is required' });
    }

    const { name } = req.params;
    const { displayName, description, isActive } = req.body;

    const type = await updateType(name, { displayName, description, isActive });
    if (!type) {
      return res.status(404).json({ message: 'Interaction type not found' });
    }

    res.json({ type });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message, errors: errorInfo.errors });
  }
}

async function deleteTypeEndpoint(req, res, next) {
  try {
    const { name } = req.params;
    const type = await deleteType(name);
    if (!type) {
      return res.status(404).json({ message: 'Interaction type not found' });
    }

    res.json({ message: 'Interaction type deleted successfully', type });
  } catch (error) {
    const errorInfo = handleMongooseError(error);
    return res.status(errorInfo.status).json({ message: errorInfo.message });
  }
}

module.exports = {
  listTypes,
  getType,
  createTypeEndpoint,
  updateTypeEndpoint,
  deleteTypeEndpoint,
};

