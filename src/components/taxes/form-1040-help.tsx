'use client'

import { HelpCircle, X, FileText, DollarSign, Calculator, Users, Lightbulb } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default function Form1040Help() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          Ayuda del Form 1040
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Guía del Form 1040 - Individual Income Tax Return
          </DialogTitle>
          <DialogDescription>
            Ayuda completa para completar su declaración de impuestos
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">General</TabsTrigger>
            <TabsTrigger value="income">Ingresos</TabsTrigger>
            <TabsTrigger value="deductions">Deducciones</TabsTrigger>
            <TabsTrigger value="credits">Créditos</TabsTrigger>
            <TabsTrigger value="tips">Consejos</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>¿Qué es el Form 1040?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  El Form 1040 es el formulario principal que los contribuyentes individuales de EE.UU. 
                  usan para presentar su declaración anual de impuestos sobre la renta.
                </p>
                
                <div className="space-y-2">
                  <h4 className="font-semibold">Estados de Presentación (Filing Status):</h4>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="border-l-4 border-blue-500 pl-3 py-2">
                      <p className="font-medium">Single (Soltero)</p>
                      <p className="text-xs text-muted-foreground">Deducción estándar 2024: $14,600</p>
                    </div>
                    <div className="border-l-4 border-green-500 pl-3 py-2">
                      <p className="font-medium">Married Filing Jointly (Casado en conjunto)</p>
                      <p className="text-xs text-muted-foreground">Deducción estándar 2024: $29,200</p>
                    </div>
                    <div className="border-l-4 border-yellow-500 pl-3 py-2">
                      <p className="font-medium">Head of Household (Jefe de familia)</p>
                      <p className="text-xs text-muted-foreground">Deducción estándar 2024: $21,900</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="text-sm">
                    💡 <strong>Consejo:</strong> Use el botón "Auto-Llenar desde Empresa" para 
                    cargar automáticamente sus ingresos W-2, ingresos de negocio y retenciones.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fechas Importantes 2025</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Fecha límite de presentación:</span>
                    <Badge>15 de Abril, 2025</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm">Con extensión:</span>
                    <Badge variant="outline">15 de Octubre, 2025</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm">Pagos estimados Q1:</span>
                    <Badge variant="outline">15 de Abril, 2025</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Income Tab */}
          <TabsContent value="income" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Tipos de Ingresos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="border-l-4 border-primary pl-3 py-2">
                    <p className="font-medium">Line 1a: Wages (Salarios)</p>
                    <p className="text-xs text-muted-foreground">
                      Salarios, sueldos y propinas reportados en formularios W-2
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-3 py-2">
                    <p className="font-medium">Line 2b: Taxable Interest (Intereses)</p>
                    <p className="text-xs text-muted-foreground">
                      Intereses de cuentas bancarias, bonos, etc. (Form 1099-INT)
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-3 py-2">
                    <p className="font-medium">Line 3b: Ordinary Dividends (Dividendos)</p>
                    <p className="text-xs text-muted-foreground">
                      Dividendos de acciones e inversiones (Form 1099-DIV)
                    </p>
                  </div>

                  <div className="border-l-4 border-primary pl-3 py-2">
                    <p className="font-medium">Line 8: Other Income (Schedule C)</p>
                    <p className="text-xs text-muted-foreground">
                      Ingresos de negocio, trabajo independiente, rentas, etc.
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg mt-4">
                  <p className="text-sm font-semibold mb-2">⚠️ No olvide reportar:</p>
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    <li>Ingresos de freelance o consultoría</li>
                    <li>Ganancias de inversiones</li>
                    <li>Premios y sorteos</li>
                    <li>Cancelaciones de deuda</li>
                    <li>Distribuciones de cuentas de retiro</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Schedule C - Negocio Propio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Si es trabajador independiente o tiene un negocio, debe completar Schedule C.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 bg-muted px-3 rounded">
                    <span className="text-sm font-medium">Ingresos Brutos</span>
                    <span className="text-xs">Todas las ventas y servicios</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-muted px-3 rounded">
                    <span className="text-sm font-medium">Menos: Gastos</span>
                    <span className="text-xs">Gastos ordinarios y necesarios</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-primary/10 px-3 rounded">
                    <span className="text-sm font-semibold">= Ganancia Neta</span>
                    <span className="text-xs">Se suma a Line 8</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-2">
                  💡 Si tiene ganancia neta ≥ $400, también debe pagar Self-Employment Tax (15.3%)
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deductions Tab */}
          <TabsContent value="deductions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Deducciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Deducción Estándar 2024:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="border p-2 rounded">
                      <p className="text-xs text-muted-foreground">Single</p>
                      <p className="text-lg font-bold">$14,600</p>
                    </div>
                    <div className="border p-2 rounded">
                      <p className="text-xs text-muted-foreground">Married Joint</p>
                      <p className="text-lg font-bold">$29,200</p>
                    </div>
                    <div className="border p-2 rounded">
                      <p className="text-xs text-muted-foreground">Head of Household</p>
                      <p className="text-lg font-bold">$21,900</p>
                    </div>
                    <div className="border p-2 rounded">
                      <p className="text-xs text-muted-foreground">Adicional 65+</p>
                      <p className="text-lg font-bold">$1,550-$1,950</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Ajustes al Ingreso (Above-the-line):</h4>
                  <ul className="space-y-1 text-sm ml-4 list-disc">
                    <li>Mitad del impuesto de auto-empleo</li>
                    <li>Contribuciones a SEP-IRA, SIMPLE IRA</li>
                    <li>Seguro de salud (trabajadores independientes)</li>
                    <li>Intereses de préstamos estudiantiles (hasta $2,500)</li>
                    <li>Gastos de educador (hasta $300)</li>
                  </ul>
                </div>

                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <p className="text-sm">
                    💰 <strong>Trabajadores Independientes:</strong> Pueden deducir el 100% de 
                    las primas de seguro de salud como ajuste al ingreso.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gastos de Negocio Comunes (Schedule C)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Publicidad</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Gastos de oficina</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Honorarios legales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Software y apps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Viajes de negocio</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Comidas (50%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Teléfono e internet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">✓</Badge>
                    <span>Educación profesional</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Credits Tab */}
          <TabsContent value="credits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Créditos Tributarios
                </CardTitle>
                <CardDescription>
                  Los créditos reducen su impuesto dólar por dólar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4 py-3">
                  <h4 className="font-semibold text-green-700 dark:text-green-400">
                    Child Tax Credit (Crédito Tributario por Hijos)
                  </h4>
                  <p className="text-sm mt-1 mb-2">
                    Hasta <strong>$2,000</strong> por niño menor de 17 años
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>✓ El niño debe tener SSN válido</p>
                    <p>✓ Debe haber vivido con usted más de 6 meses</p>
                    <p>✓ No puede haber proporcionado más de la mitad de su sustento</p>
                  </div>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Hasta $1,700 es reembolsable (Additional Child Tax Credit)
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-4 py-3">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-400">
                    Credit for Other Dependents
                  </h4>
                  <p className="text-sm mt-1">
                    Hasta <strong>$500</strong> por dependiente que no califica para Child Tax Credit
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Incluye: niños de 17+ años, padres, otros familiares calificados
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4 py-3">
                  <h4 className="font-semibold text-purple-700 dark:text-purple-400">
                    Earned Income Tax Credit (EITC)
                  </h4>
                  <p className="text-sm mt-1">
                    Hasta <strong>$7,430</strong> (con 3+ hijos calificados)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Crédito reembolsable para trabajadores de bajos a moderados ingresos
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <p className="text-sm">
                    💡 <strong>Importante:</strong> Los créditos se reducen (phase-out) 
                    para contribuyentes de altos ingresos. Consulte las tablas del IRS.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tips Tab */}
          <TabsContent value="tips" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Consejos y Estrategias
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                    <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">
                      Maximice su Reembolso
                    </h4>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li>Contribuya a cuentas de retiro (IRA, 401k) antes del 15 de abril</li>
                      <li>Revise si califica para créditos tributarios</li>
                      <li>Mantenga registros de gastos deducibles</li>
                      <li>Considere agrupar deducciones en un solo año</li>
                    </ul>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg">
                    <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-1">
                      Evite Multas
                    </h4>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li>Haga pagos estimados si espera deber más de $1,000</li>
                      <li>Pague al menos el 90% del impuesto del año actual</li>
                      <li>O el 100% del impuesto del año anterior</li>
                      <li>Presente a tiempo (o solicite extensión)</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      Trabajadores Independientes
                    </h4>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li>Separe gastos personales de los de negocio</li>
                      <li>Rastree millas de negocio ($0.67/milla en 2024)</li>
                      <li>Considere SEP-IRA o Solo 401(k)</li>
                      <li>Deducir oficina en casa si califica</li>
                      <li>No olvide el impuesto de auto-empleo (15.3%)</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg">
                    <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">
                      Documentación Importante
                    </h4>
                    <ul className="text-sm space-y-1 ml-4 list-disc">
                      <li>Formularios W-2 y 1099</li>
                      <li>Recibos de gastos deducibles</li>
                      <li>Comprobantes de contribuciones a caridad</li>
                      <li>Estados de cuenta de cuentas de retiro</li>
                      <li>Documentos de compra/venta de propiedades</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      Conserve registros por al menos 3 años (7 años recomendado)
                    </p>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <h4 className="font-semibold mb-2">Use las Sugerencias de IA</h4>
                  <p className="text-sm text-muted-foreground">
                    Después de guardar su formulario, haga clic en "Sugerencias de IA" para 
                    obtener recomendaciones personalizadas de optimización fiscal basadas en su 
                    situación específica.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            💡 Para más información, visite{' '}
            <a href="https://www.irs.gov/forms-pubs/about-form-1040" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              IRS.gov - Form 1040
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
