import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Filter } from 'lucide-react';
import { reportService } from '../services/reportService';
import type { Report } from '../types';

interface ReportFormProps {
  report: Report | null;
  onSubmit: () => void;
  onCancel: () => void;
}

export function ReportForm({ report, onSubmit, onCancel }: ReportFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    report_type: 'sales' as Report['report_type'],
    period: 'month',
    date_range_start: '',
    date_range_end: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (report) {
      setFormData({
        title: report.title,
        description: report.description,
        report_type: report.report_type,
        period: (report.filters as any)?.period || 'month',
        date_range_start: report.date_range_start || '',
        date_range_end: report.date_range_end || ''
      });
    }
  }, [report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const reportData = {
        title: formData.title,
        description: formData.description,
        report_type: formData.report_type,
        filters: { period: formData.period },
        date_range_start: formData.date_range_start || null,
        date_range_end: formData.date_range_end || null
      };

      if (report) {
        await reportService.update(report.id, reportData);
      } else {
        await reportService.create(reportData);
      }

      onSubmit();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {report ? 'Editar Reporte' : 'Nuevo Reporte'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del Reporte *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  placeholder="Ej: Ventas Mensuales"
                />
              </div>
            </div>

            <div>
              <label htmlFor="report_type" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Reporte
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="report_type"
                  name="report_type"
                  value={formData.report_type}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="sales">Ventas</option>
                  <option value="inventory">Inventario</option>
                  <option value="customers">Clientes</option>
                  <option value="suppliers">Proveedores</option>
                  <option value="returns">Devoluciones</option>
                  <option value="installments">Abonos</option>
                  <option value="financial">Financiero</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Descripción del reporte..."
              />
            </div>

            <div>
              <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="period"
                  name="period"
                  value={formData.period}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="today">Hoy</option>
                  <option value="week">Esta Semana</option>
                  <option value="month">Este Mes</option>
                  <option value="year">Este Año</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>
            </div>

            {formData.period === 'custom' && (
              <>
                <div>
                  <label htmlFor="date_range_start" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    id="date_range_start"
                    name="date_range_start"
                    value={formData.date_range_start}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="date_range_end" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    id="date_range_end"
                    name="date_range_end"
                    value={formData.date_range_end}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? 'Guardando...' : report ? 'Actualizar' : 'Crear Reporte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}