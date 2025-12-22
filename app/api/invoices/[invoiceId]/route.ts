
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { invoiceId: string } }
) {
  try {
    // En desarrollo, simular usuario autenticado
    const mockSession = { user: { id: '1' } }
    
    if (!mockSession) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { invoiceId } = params

    // En desarrollo, generar PDF simulado
    if (process.env.NODE_ENV === 'development') {
      // Simular generación de factura PDF
      const mockPDFContent = generateMockInvoicePDF(invoiceId)
      
      return new NextResponse(mockPDFContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="factura-${invoiceId}.pdf"`
        }
      })
    }

    // En producción, generar PDF real con una librería como puppeteer o jsPDF
    /*
    const invoiceData = await getInvoiceData(invoiceId)
    const pdfBuffer = await generateInvoicePDF(invoiceData)
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="factura-${invoiceId}.pdf"`
      }
    })
    */

    return NextResponse.json(
      { error: 'Generación de PDF no implementada en producción' },
      { status: 501 }
    )

  } catch (error) {
    console.error('Error generando factura:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

function generateMockInvoicePDF(invoiceId: string): Buffer {
  // Simular contenido de PDF básico
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 200 >>
stream
BT
/F1 12 Tf
100 700 Td
(FACTURA ELECTRONICA) Tj
0 -50 Td
(Factura N°: ${invoiceId}) Tj
0 -30 Td
(Fecha: ${new Date().toLocaleDateString('es-CL')}) Tj
0 -30 Td
(Cliente: Radio Ejemplo FM) Tj
0 -30 Td
(Plan: Profesional) Tj
0 -30 Td
(Monto: $59.900 CLP) Tj
0 -30 Td
(IVA: $11.381 CLP) Tj
0 -30 Td
(Total: $71.281 CLP) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000110 00000 n 
0000000205 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
450
%%EOF`

  return Buffer.from(pdfContent, 'utf-8')
}
