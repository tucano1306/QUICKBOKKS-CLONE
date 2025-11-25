'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TaxForm {
  id: string;
  type: string;
  year: number;
  quarter?: number;
  status: string;
  generatedAt: Date;
  totalTax?: number;
}

export default function TaxFormsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedType, setSelectedType] = useState<'941' | '940' | 'rt6' | 'w2' | 'w3'>('941');
  const [loading, setLoading] = useState(false);
  const [forms, setForms] = useState<TaxForm[]>([]);
  const [formData, setFormData] = useState<any>(null);

  const formTypes = [
    { value: '941', label: 'Form 941 - Quarterly Federal Tax', frequency: 'Trimestral', description: 'Retenciones federales empleados' },
    { value: '940', label: 'Form 940 - Annual FUTA', frequency: 'Anual', description: 'Impuesto federal desempleo' },
    { value: 'rt6', label: 'RT-6 - Florida Reemployment Tax', frequency: 'Trimestral', description: 'Impuesto reempleo Florida' },
    { value: 'w2', label: 'Form W-2 - Wage and Tax Statement', frequency: 'Anual', description: 'Declaración salarios empleados' },
    { value: 'w3', label: 'Form W-3 - Transmittal of Wage', frequency: 'Anual', description: 'Resumen W-2 para SSA' },
  ];

  const generateForm = async (quarter?: number, employeeId?: string) => {
    setLoading(true);
    try {
      const params: any = { type: selectedType, year: selectedYear };
      if (quarter) params.quarter = quarter;
      if (employeeId) params.employeeId = employeeId;

      const response = await fetch('/api/tax-forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error generando formulario');
      }

      const data = await response.json();
      setFormData(data);
      await loadForms();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error generando formulario');
    } finally {
      setLoading(false);
    }
  };

  const loadForms = async () => {
    try {
      const response = await fetch(`/api/tax-forms?type=${selectedType}&year=${selectedYear}`);
      if (response.ok) {
        const data = await response.json();
        setForms(Array.isArray(data) ? data : [data]);
      }
    } catch (error) {
      console.error('Error cargando formularios:', error);
    }
  };

  const renderForm941 = (data: any) => (
    <div className="space-y-4 p-6 bg-white rounded-lg border">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Form 941</h3>
          <p className="text-gray-600">Employer's Quarterly Federal Tax Return</p>
          <p className="text-sm text-gray-500">Q{data.quarter} {data.year}</p>
        </div>
        <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600">Número de empleados</p>
          <p className="text-2xl font-bold">{data.numberOfEmployees}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Salarios y propinas</p>
          <p className="text-2xl font-bold">${(data.wagesAndTips || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Retención federal</p>
          <p className="text-2xl font-bold">${(data.federalIncomeTaxWithheld || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Salarios Seguro Social</p>
          <p className="text-2xl font-bold">${(data.socialSecurityWages || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Impuesto Seguro Social</p>
          <p className="text-2xl font-bold">${(data.socialSecurityTax || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Salarios Medicare</p>
          <p className="text-2xl font-bold">${(data.medicareWages || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Impuesto Medicare</p>
          <p className="text-2xl font-bold">${(data.medicareTax || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Medicare adicional</p>
          <p className="text-2xl font-bold">${(data.additionalMedicareTax || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Impuestos totales</p>
            <p className="text-xl font-bold text-blue-600">${(data.totalTaxes || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total de depósitos</p>
            <p className="text-xl font-bold">${(data.totalDeposits || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{(data.balanceDue || 0) >= 0 ? 'Balance a pagar' : 'Sobrepago'}</p>
            <p className={`text-xl font-bold ${(data.balanceDue || 0) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${Math.abs(data.balanceDue || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderForm940 = (data: any) => (
    <div className="space-y-4 p-6 bg-white rounded-lg border">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Form 940</h3>
          <p className="text-gray-600">Employer's Annual Federal Unemployment (FUTA) Tax Return</p>
          <p className="text-sm text-gray-500">{data.year}</p>
        </div>
        <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600">Salarios totales pagados</p>
          <p className="text-2xl font-bold">${(data.totalWagesPaid || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Salarios sujetos a FUTA</p>
          <p className="text-2xl font-bold">${(data.futaWages || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Tasa FUTA (antes de crédito)</p>
          <p className="text-2xl font-bold">6.0%</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Crédito estatal</p>
          <p className="text-2xl font-bold text-green-600">${(data.stateUnemploymentCredit || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Impuesto FUTA</p>
          <p className="text-2xl font-bold text-blue-600">${(data.futaTax || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Tasa neta FUTA</p>
          <p className="text-2xl font-bold">0.6%</p>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Depósitos realizados</p>
            <p className="text-xl font-bold">${(data.totalDeposits || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">{(data.balanceDue || 0) > 0 ? 'Saldo a pagar' : 'Sobrepago'}</p>
            <p className={`text-xl font-bold ${(data.balanceDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ${Math.abs(data.balanceDue || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>Base salarial FUTA:</strong> $7,000 por empleado por año. Solo se gravan los primeros $7,000 de salarios de cada empleado.
        </p>
      </div>
    </div>
  );

  const renderRT6 = (data: any) => (
    <div className="space-y-4 p-6 bg-white rounded-lg border">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Form RT-6</h3>
          <p className="text-gray-600">Florida Employer's Quarterly Report</p>
          <p className="text-sm text-gray-500">Q{data.quarter} {data.year}</p>
        </div>
        <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-sm text-gray-600">Número de empleados</p>
          <p className="text-2xl font-bold">{data.employeeCount}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Salarios gravables</p>
          <p className="text-2xl font-bold">${(data.taxableWages || 0).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Salarios en exceso</p>
          <p className="text-2xl font-bold">${(data.excessWages || 0).toFixed(2)}</p>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Impuesto de reempleo Florida (2.7%)</p>
            <p className="text-3xl font-bold text-blue-600">${(data.taxDue || 0).toFixed(2)}</p>
          </div>
          <Badge className="bg-orange-500 text-white">Pago trimestral</Badge>
        </div>
      </div>

      {data.employeeDetails && data.employeeDetails.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Detalle por empleado</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Empleado</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Salarios</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gravable</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Exceso</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.employeeDetails.map((emp: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-sm">{emp.employeeName}</td>
                    <td className="px-4 py-2 text-sm text-right">${(emp.totalWages || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right">${(emp.taxableWages || 0).toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm text-right">${(emp.excessWages || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-orange-50 p-4 rounded">
        <p className="text-sm text-orange-800">
          <strong>Base salarial Florida SUI:</strong> $7,000 por empleado por año. Tasa: 2.7%. Solo se gravan los primeros $7,000 de salarios de cada empleado.
        </p>
      </div>
    </div>
  );

  const renderW3 = (data: any) => (
    <div className="space-y-4 p-6 bg-white rounded-lg border">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h3 className="text-2xl font-bold">Form W-3</h3>
          <p className="text-gray-600">Transmittal of Wage and Tax Statements</p>
          <p className="text-sm text-gray-500">{data.year}</p>
        </div>
        <Button onClick={() => window.print()}>🖨️ Imprimir</Button>
      </div>

      <div className="bg-blue-50 p-4 rounded mb-4">
        <p className="text-sm text-blue-800">
          <strong>Información de la empresa:</strong> Este formulario debe enviarse a la SSA junto con todos los formularios W-2 antes del 31 de enero.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-gray-600">EIN</p>
          <p className="text-xl font-bold">{data.ein}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Establecimiento</p>
          <p className="text-xl font-bold">{data.establishmentNumber}</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="mb-4">
          <p className="text-sm text-gray-600">Nombre de la empresa</p>
          <p className="text-lg font-bold">{data.companyName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Dirección</p>
          <p className="text-lg">{data.companyAddress}</p>
        </div>
      </div>

      <div className="border-t pt-4 mt-4">
        <div className="bg-gray-50 p-4 rounded mb-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Número de formularios W-2</p>
            <p className="text-2xl font-bold text-blue-600">{data.numberOfW2Forms}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Salarios totales</p>
            <p className="text-xl font-bold">${(data.totalWages || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Retención federal</p>
            <p className="text-xl font-bold">${(data.totalFederalIncomeTaxWithheld || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Salarios Seguro Social</p>
            <p className="text-xl font-bold">${(data.totalSocialSecurityWages || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Impuesto Seguro Social</p>
            <p className="text-xl font-bold">${(data.totalSocialSecurityTaxWithheld || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Salarios Medicare</p>
            <p className="text-xl font-bold">${(data.totalMedicareWages || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white p-4 rounded border">
            <p className="text-sm text-gray-600">Impuesto Medicare</p>
            <p className="text-xl font-bold">${(data.totalMedicareTaxWithheld || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {(data.totalStateWages || 0) > 0 && (
        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold mb-3">Impuestos estatales</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded border">
              <p className="text-sm text-gray-600">Salarios estatales</p>
              <p className="text-xl font-bold">${(data.totalStateWages || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white p-4 rounded border">
              <p className="text-sm text-gray-600">Retención estatal</p>
              <p className="text-xl font-bold">${(data.totalStateIncomeTaxWithheld || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t pt-4 mt-4">
        <div className="bg-yellow-50 p-4 rounded">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Fecha límite:</strong> Este formulario debe presentarse a la SSA antes del <strong>31 de enero de {data.year + 1}</strong>.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded">
        <p className="text-xs text-gray-600">
          <strong>Nota:</strong> El Form W-3 es un resumen de todos los formularios W-2 emitidos durante el año. 
          Los totales mostrados deben coincidir con la suma de todos los W-2 individuales. 
          Este formulario se envía electrónicamente o por correo a la Social Security Administration junto con las copias A de todos los W-2.
        </p>
      </div>
    </div>
  );

  const renderW2Forms = (w2Array: any[]) => {
    if (!Array.isArray(w2Array) || w2Array.length === 0) {
      return (
        <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800">No hay empleados registrados o no hay datos de nómina para el año {selectedYear}.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">Formularios W-2 - {selectedYear}</h3>
          <Badge className="bg-blue-600 text-white">{w2Array.length} empleados</Badge>
        </div>

        {w2Array.map((w2: any, index: number) => (
          <div key={index} className="p-6 bg-white rounded-lg border space-y-4">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h4 className="text-lg font-bold">Form W-2</h4>
                <p className="text-gray-600">Wage and Tax Statement - {w2.year}</p>
              </div>
              <Button onClick={() => window.print()} size="sm">🖨️ Imprimir</Button>
            </div>

            {/* Información del empleado */}
            <div className="bg-blue-50 p-4 rounded">
              <h5 className="font-semibold mb-2">Información del empleado</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Nombre</p>
                  <p className="font-medium">{w2.employeeName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">SSN</p>
                  <p className="font-medium">{w2.employeeSSN}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600">Dirección</p>
                  <p className="text-sm">{w2.employeeAddress}</p>
                </div>
              </div>
            </div>

            {/* Información del empleador */}
            <div className="bg-gray-50 p-4 rounded">
              <h5 className="font-semibold mb-2">Información del empleador</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-600">EIN</p>
                  <p className="font-medium">{w2.ein}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Nombre de la empresa</p>
                  <p className="font-medium">{w2.companyName}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-600">Dirección</p>
                  <p className="text-sm">{w2.companyAddress}</p>
                </div>
              </div>
            </div>

            {/* Salarios e impuestos federales */}
            <div className="border-t pt-4">
              <h5 className="font-semibold mb-3">Salarios e impuestos federales</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-gray-600">Box 1 - Salarios totales</p>
                  <p className="text-lg font-bold">${(w2.wages || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-gray-600">Box 2 - Retención federal</p>
                  <p className="text-lg font-bold text-blue-600">${(w2.federalIncomeTaxWithheld || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-gray-600">Box 3 - Salarios SS</p>
                  <p className="text-lg font-bold">${(w2.socialSecurityWages || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-gray-600">Box 4 - Impuesto SS</p>
                  <p className="text-lg font-bold text-blue-600">${(w2.socialSecurityTaxWithheld || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-gray-600">Box 5 - Salarios Medicare</p>
                  <p className="text-lg font-bold">${(w2.medicareWages || 0).toFixed(2)}</p>
                </div>
                <div className="bg-white p-3 rounded border">
                  <p className="text-xs text-gray-600">Box 6 - Impuesto Medicare</p>
                  <p className="text-lg font-bold text-blue-600">${(w2.medicareTaxWithheld || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Impuestos estatales */}
            {(w2.stateWages || 0) > 0 && (
              <div className="border-t pt-4">
                <h5 className="font-semibold mb-3">Impuestos estatales</h5>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600">Box 15 - Estado</p>
                    <p className="font-medium">{w2.stateName || 'N/A'}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600">Box 16 - Salarios estatales</p>
                    <p className="text-lg font-bold">${(w2.stateWages || 0).toFixed(2)}</p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600">Box 17 - Retención estatal</p>
                    <p className="text-lg font-bold text-blue-600">${(w2.stateIncomeTaxWithheld || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-yellow-50 p-3 rounded">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Recordatorio:</strong> Copia B debe entregarse al empleado antes del 31 de enero. Copia A debe enviarse a la SSA junto con el Form W-3.
              </p>
            </div>
          </div>
        ))}

        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>Total de formularios W-2:</strong> {w2Array.length} | 
            <strong className="ml-4">Salarios totales:</strong> ${w2Array.reduce((sum, w2) => sum + (w2.wages || 0), 0).toFixed(2)} | 
            <strong className="ml-4">Retención federal total:</strong> ${w2Array.reduce((sum, w2) => sum + (w2.federalIncomeTaxWithheld || 0), 0).toFixed(2)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Formularios de Impuestos</h1>
            <p className="text-gray-600">Generar y ver formularios fiscales federales y estatales</p>
          </div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border rounded-lg"
          >
            {[2025, 2024, 2023, 2022].map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {formTypes.map((form) => (
            <Card
              key={form.value}
              className={`p-4 cursor-pointer transition-all ${
                selectedType === form.value ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-lg'
              }`}
              onClick={() => setSelectedType(form.value as any)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{form.label}</h3>
                  <p className="text-sm text-gray-600 mt-1">{form.description}</p>
                </div>
                <Badge>{form.frequency}</Badge>
              </div>
            </Card>
          ))}
        </div>

        {(selectedType === '941' || selectedType === 'rt6') && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generar formulario trimestral</h3>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((quarter) => (
                <Button
                  key={quarter}
                  onClick={() => generateForm(quarter)}
                  disabled={loading}
                  variant="outline"
                >
                  Q{quarter} {selectedYear}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {selectedType === '940' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generar formulario anual</h3>
            <Button onClick={() => generateForm()} disabled={loading}>
              Generar Form 940 {selectedYear}
            </Button>
          </Card>
        )}

        {selectedType === 'w2' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Formularios W-2</h3>
            <p className="text-sm text-gray-600 mb-4">
              Los formularios W-2 se generan automáticamente para todos los empleados. Haz clic en "Cargar" para ver los formularios del año seleccionado.
            </p>
            <Button onClick={() => loadForms()} disabled={loading}>
              Cargar W-2 {selectedYear}
            </Button>
          </Card>
        )}

        {selectedType === 'w3' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generar formulario anual</h3>
            <Button onClick={() => generateForm()} disabled={loading}>
              Generar Form W-3 {selectedYear}
            </Button>
          </Card>
        )}

        {formData && (
          <div>
            {selectedType === '941' && renderForm941(formData)}
            {selectedType === '940' && renderForm940(formData)}
            {selectedType === 'rt6' && renderRT6(formData)}
            {selectedType === 'w3' && renderW3(formData)}
            {selectedType === 'w2' && renderW2Forms(Array.isArray(formData) ? formData : [formData])}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
