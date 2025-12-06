'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function PaymentPage({ params }: { params: { code: string } }) {
  const [paymentLink, setPaymentLink] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CHECK' | 'CASH' | 'BANK_TRANSFER'>('BANK_TRANSFER');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadPaymentLink();
  }, []);

  const loadPaymentLink = async () => {
    try {
      const response = await fetch(`/api/payment-links?code=${params.code}`);
      if (!response.ok) throw new Error('Payment link no encontrado');
      
      const data = await response.json();
      setPaymentLink(data);
      setAmount(data.invoice.balance.toString());
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process-payment',
          shortCode: params.code,
          paymentDetails: {
            amount: parseFloat(amount),
            paymentMethod,
            reference,
            notes,
          },
        }),
      });

      if (!response.ok) throw new Error('Error procesando pago');

      const result = await response.json();

      if (result.success) {
        alert('¡Pago procesado exitosamente!');
        // Redireccionar a página de confirmación
        window.location.href = '/portal/payment-success';
      } else {
        alert(result.error || 'Error procesando pago');
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de pago...</p>
        </div>
      </div>
    );
  }

  if (!paymentLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Link de Pago Inválido</h1>
          <p className="text-gray-600">Este link de pago no existe o ha expirado.</p>
        </Card>
      </div>
    );
  }

  const invoice = paymentLink.invoice;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Realizar Pago</h1>
          <p className="text-gray-600 mt-2">Pago seguro para {invoice.user.name}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Invoice Details */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Detalles de Factura</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Factura #</span>
                <span className="font-semibold">{invoice.invoiceNumber}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Cliente</span>
                <span className="font-semibold">{invoice.customer.name}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Fecha</span>
                <span>{new Date(invoice.date).toLocaleDateString()}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Vencimiento</span>
                <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>

              <div className="border-t pt-3 mt-3">
                <h3 className="font-semibold mb-2">Items:</h3>
                {invoice.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm py-1">
                    <span>
                      {item.description} (x{item.quantity})
                    </span>
                    <span>${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${parseFloat(invoice.total).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>Pagado</span>
                  <span>${parseFloat(invoice.paidAmount || 0).toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-xl font-bold text-blue-600 mt-2">
                  <span>Balance</span>
                  <span>${parseFloat(invoice.balance).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment Form */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Información de Pago</h2>

            {paymentLink.paymentProvider === 'STRIPE' ? (
              <div>
                <p className="text-gray-600 mb-4">
                  Este pago se procesará de forma segura a través de Stripe.
                </p>
                <Button
                  className="w-full"
                  onClick={() => window.open(paymentLink.url, '_blank')}
                >
                  💳 Pagar con Stripe
                </Button>
              </div>
            ) : (
              <form onSubmit={handlePayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Monto a Pagar</label>
                  <Input
                    type="text"
                    className="amount-input"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo: ${parseFloat(invoice.balance).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Método de Pago</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="BANK_TRANSFER">Transferencia Bancaria</option>
                    <option value="CHECK">Cheque</option>
                    <option value="CASH">Efectivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Referencia/Número de Transacción
                  </label>
                  <Input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Ej: TRX123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notas (Opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Información adicional..."
                  />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'Procesando...' : `💰 Procesar Pago de $${amount}`}
                </Button>
              </form>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                🔒 <strong>Pago Seguro:</strong> Tu información está protegida y encriptada.
              </p>
            </div>
          </Card>
        </div>

        {paymentLink.customMessage && (
          <Card className="mt-6 p-6 bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Mensaje:</strong> {paymentLink.customMessage}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
