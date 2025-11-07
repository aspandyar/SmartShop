import { useEffect, useState } from 'react';
import { interactionTypesAPI } from '../../services/api';
import './AdminPages.css';

export function AdminInteractionTypesPage() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    isActive: true,
  });

  useEffect(() => {
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const response = await interactionTypesAPI.getAll();
      setTypes(response.data.types || []);
    } catch (err) {
      setError('Failed to load interaction types');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingType) {
        await interactionTypesAPI.update(editingType.name, {
          displayName: formData.displayName,
          description: formData.description,
          isActive: formData.isActive,
        });
      } else {
        await interactionTypesAPI.create(formData);
      }

      setShowModal(false);
      setEditingType(null);
      resetForm();
      loadTypes();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save interaction type');
    }
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name || '',
      displayName: type.displayName || '',
      description: type.description || '',
      isActive: type.isActive !== undefined ? type.isActive : true,
    });
    setShowModal(true);
  };

  const handleDelete = async (name) => {
    if (!window.confirm('Are you sure you want to delete this interaction type?')) return;

    try {
      await interactionTypesAPI.delete(name);
      loadTypes();
    } catch (err) {
      setError('Failed to delete interaction type');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayName: '',
      description: '',
      isActive: true,
    });
  };

  if (loading) {
    return <div className="loading">Loading interaction types...</div>;
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Manage Interaction Types</h1>
        <button onClick={() => { setShowModal(true); resetForm(); setEditingType(null); }} className="btn-primary">
          Add Type
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Display Name</th>
            <th>Description</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {types.map((type) => (
            <tr key={type._id}>
              <td>{type.name}</td>
              <td>{type.displayName}</td>
              <td>{type.description || '-'}</td>
              <td>
                <span className={`badge ${type.isActive ? 'badge-active' : 'badge-inactive'}`}>
                  {type.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button onClick={() => handleEdit(type)} className="btn-edit">Edit</button>
                <button onClick={() => handleDelete(type.name)} className="btn-delete">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); setEditingType(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingType ? 'Edit Interaction Type' : 'Add Interaction Type'}</h2>
            <form onSubmit={handleSubmit}>
              {!editingType && (
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().trim() })}
                    required
                    placeholder="favorite"
                  />
                </div>
              )}
              <div className="form-group">
                <label>Display Name *</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>
              {editingType && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              )}
              <div className="modal-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" onClick={() => { setShowModal(false); resetForm(); setEditingType(null); }} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminInteractionTypesPage;

