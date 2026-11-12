// Orçamento do projeto em PDF (recurso Pro). Gerado no navegador com jsPDF:
// nada é enviado para o servidor. A biblioteca só é carregada quando a pessoa
// clica em "Baixar orçamento", então não pesa no carregamento do site.

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const BOTTOM_LIMIT = PAGE_H - 22;

// colunas da tabela (mm). Valores e quantidade são alinhados à direita.
const COL_NAME = MARGIN;
const COL_BRAND = 98;
const COL_QTY = 140;
const COL_UNIT = 168;
const COL_SUBTOTAL = PAGE_W - MARGIN;

function formatCurrency(value) {
  // o espaço do "R$ 1.000,00" é um NBSP, que a fonte do PDF não desenha bem
  return Number(value || 0)
    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    .replace(/ /g, " ");
}

function drawTableHeader(doc, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(110);

  doc.text("PEÇA", COL_NAME, y);
  doc.text("MARCA", COL_BRAND, y);
  doc.text("QTD.", COL_QTY, y, { align: "right" });
  doc.text("UNITÁRIO", COL_UNIT, y, { align: "right" });
  doc.text("SUBTOTAL", COL_SUBTOTAL, y, { align: "right" });

  doc.setDrawColor(40);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 2.5, PAGE_W - MARGIN, y + 2.5);

  return y + 8;
}

// items: [{ name, brand, quantity, unitPrice }]
export async function buildBudgetPdf({ projectName, vehicleText, items }) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const total = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );

  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("ORÇAMENTO DE PROJETO", MARGIN, y);

  y += 9;
  doc.setFontSize(20);
  doc.setTextColor(20);
  const titleLines = doc.splitTextToSize(projectName || "Projeto", 180);
  doc.text(titleLines, MARGIN, y);
  y += titleLines.length * 8;

  if (vehicleText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(vehicleText, MARGIN, y);
    y += 6;
  }

  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString("pt-BR")}`,
    MARGIN,
    y,
  );

  y += 12;

  if (items.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(90);
    doc.text("Este projeto ainda não tem peças.", MARGIN, y);
  } else {
    y = drawTableHeader(doc, y);

    items.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      const nameLines = doc.splitTextToSize(item.name, COL_BRAND - COL_NAME - 4);
      const brandLines = doc.splitTextToSize(
        item.brand || "-",
        COL_QTY - COL_BRAND - 14,
      );
      const lines = Math.max(nameLines.length, brandLines.length);
      const rowHeight = lines * 4.6 + 3;

      if (y + rowHeight > BOTTOM_LIMIT) {
        doc.addPage();
        y = drawTableHeader(doc, 22);
      }

      // o cabeçalho da tabela muda a fonte: volta para a das linhas
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.setTextColor(25);
      doc.text(nameLines, COL_NAME, y);

      doc.setTextColor(90);
      doc.text(brandLines, COL_BRAND, y);

      doc.setTextColor(25);
      doc.text(String(item.quantity), COL_QTY, y, { align: "right" });
      doc.text(formatCurrency(item.unitPrice), COL_UNIT, y, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.text(
        formatCurrency(item.unitPrice * item.quantity),
        COL_SUBTOTAL,
        y,
        { align: "right" },
      );

      doc.setDrawColor(225);
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y + rowHeight - 3.2, PAGE_W - MARGIN, y + rowHeight - 3.2);

      y += rowHeight;
    });

    // total (garante que não fique sozinho no fim da página)
    if (y + 16 > BOTTOM_LIMIT) {
      doc.addPage();
      y = 22;
    }

    y += 4;
    doc.setDrawColor(40);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(
      `Total estimado · ${items.length} peça${items.length !== 1 ? "s" : ""}`,
      MARGIN,
      y + 2,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(20);
    doc.text(formatCurrency(total), PAGE_W - MARGIN, y + 2.5, {
      align: "right",
    });
  }

  // rodapé em todas as páginas
  const pages = doc.getNumberOfPages();

  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(
      "Valores estimados, com base nos preços cadastrados. Podem variar na compra.",
      MARGIN,
      PAGE_H - 12,
    );
    doc.text(`${page}/${pages}`, PAGE_W - MARGIN, PAGE_H - 12, {
      align: "right",
    });
  }

  return doc;
}

function fileSlug(text) {
  return (
    String(text || "projeto")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "projeto"
  );
}

export async function downloadBudgetPdf(data) {
  const doc = await buildBudgetPdf(data);
  doc.save(`orcamento-${fileSlug(data.projectName)}.pdf`);
}