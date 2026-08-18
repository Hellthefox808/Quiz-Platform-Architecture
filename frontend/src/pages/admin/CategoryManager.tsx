import React, { useState } from 'react';
import { Category } from '../../types';
import {
  ArrowLeft,
  Edit3,
  Layers,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCategoriesQuery, useCategoryMutations } from '../../hooks/useCategories';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import { NavigateFunction } from '../../types/navigation';

interface CategoryManagerProps {
  onNavigate: NavigateFunction;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ onNavigate }) => {
  const { data: categories = [], isLoading: loading } = useCategoriesQuery(true);
  const { createCategory, updateCategory, deleteCategory } = useCategoryMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCatId(null);
    setName('');
    setDescription('');
    setIsActive(true);
    setSaveError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCatId(cat.id);
    setName(cat.name);
    setDescription(cat.description || '');
    setIsActive(cat.is_active);
    setSaveError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    try {
      if (editingCatId) {
        await updateCategory.mutateAsync({
          id: editingCatId,
          data: {
            name,
            description: description || undefined,
            is_active: isActive,
          },
        });
      } else {
        await createCategory.mutateAsync({
          name,
          description: description || undefined,
        });
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      setSaveError(errObj?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (catId: string) => {
    if (!confirm('Are you sure you want to remove or archive this category?')) return;
    try {
      await deleteCategory.mutateAsync(catId);
    } catch (err: unknown) {
      const errObj = err as Error | undefined;
      alert(errObj?.message || 'Failed to delete category');
    }
  };

  const saveLoading = createCategory.isPending || updateCategory.isPending;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-150">
      {/* Top Header */}
      <div>
        <button
          onClick={() => onNavigate('admin-dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#5c4738] hover:text-[#1c130d] mb-6 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin Console
        </button>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-[#e8dfd5]">
          <div>
            <span className="text-xs font-bold text-[#b46927] uppercase tracking-wider">Taxonomy Governance</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#1c130d] tracking-tight flex items-center gap-2 mt-1">
              <Layers className="w-7 h-7 text-[#b46927]" />
              Domain & Category Governance
            </h1>
            <p className="text-xs sm:text-sm text-[#5c4738] mt-2 max-w-xl">
              Curate taxonomy categories for organizing and routing assessments across technical domains.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            className="font-bold text-xs shadow-md shadow-[#b07238]/20"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={openCreateModal}
          >
            Add Domain Category
          </Button>
        </div>
      </div>

      {/* Categories Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-6 space-y-4 border border-[#e8dfd5] shadow-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-[#e8dfd5]/60">
              <Skeleton variant="text" width="180px" height="18px" />
              <Skeleton variant="text" width="240px" height="14px" />
              <Skeleton variant="text" width="60px" height="16px" />
              <Skeleton variant="text" width="70px" height="20px" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-10 h-10 text-[#b46927]" />}
          title="No Categories Found"
          description="Create categories to organize your assessments."
          primaryActionLabel="Create Category"
          onPrimaryAction={openCreateModal}
        />
      ) : (
        <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e8dfd5]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#5c4738]">
              <thead className="bg-[#f5efe8] text-[10px] uppercase font-mono tracking-wider text-[#8a7465] border-b border-[#e8dfd5]">
                <tr>
                  <th className="px-6 py-4">Name & Slug</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4 text-center">Quizzes</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd5]">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-[#faf7f2] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-[#1c130d] text-sm">{cat.name}</div>
                      <div className="text-[10px] text-[#8a7465] font-mono mt-1">/{cat.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-[#5c4738] max-w-xs leading-relaxed">
                      {cat.description || <span className="italic opacity-50">No description provided</span>}
                    </td>
                    <td className="px-6 py-4 text-center font-black font-mono text-[11px] text-[#1c130d]">
                      {cat.quiz_count}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={cat.is_active ? 'success' : 'neutral'} size="sm">
                        {cat.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-2 rounded-xl text-[#5c4738] hover:text-[#1c130d] hover:bg-[#faf7f2] border border-transparent hover:border-[#e8dfd5] transition cursor-pointer"
                          title="Edit category"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cat.id)}
                          className="p-2 rounded-xl text-[#8a7465] hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                          title="Delete / Deactivate"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCatId ? 'Edit Category' : 'Create Category'}
        subtitle="Manage category metadata and candidate visibility."
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="space-y-5">
          {saveError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl font-medium">
              {saveError}
            </div>
          )}

          <Input
            label="Category Name *"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Computer Science"
          />

          <div>
            <label className="block text-xs font-bold text-[#5c4738] mb-1.5 uppercase tracking-wider">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief explanation of this domain category..."
              className="w-full px-3.5 py-2 bg-white border border-[#e8dfd5] rounded-2xl text-[#1c130d] text-xs sm:text-sm focus:outline-none focus:border-[#b46927] shadow-sm"
            />
          </div>

          <div className="pt-2 border-t border-[#e8dfd5]">
            <label className="flex items-center gap-3 text-xs text-[#5c4738] cursor-pointer p-3.5 bg-[#faf7f2] border border-[#e8dfd5] rounded-2xl hover:border-[#b46927]/40 transition mt-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-[#e8dfd5] text-[#b46927] focus:ring-[#b46927] cursor-pointer"
              />
              <span>Category is active and visible to candidates</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#e8dfd5]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={saveLoading}
            >
              {editingCatId ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
