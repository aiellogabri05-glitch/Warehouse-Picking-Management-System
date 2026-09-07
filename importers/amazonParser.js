const XLSX = require("xlsx");

/**
 * Legge un file Amazon Automatico.xlsx
 * e restituisce i dati necessari per creare un task.
 *
 * Struttura prevista:
 *
 * Pronto all'uso
 * ├── Order Number
 * ├── Responsible
 * ├── Number of Operators
 * ├── OPERATORE 1
 * ├── prodotti...
 * ├── OPERATORE 2
 * ├── prodotti...
 * └── OPERATORE 3
 */

function normalize(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isNaN(number)
    ? null
    : number;
}

function findRowValue(rows, label) {
  for (const row of rows) {
    if (!row) continue;

    for (let col = 0; col < row.length; col++) {
      const value = normalize(row[col]);

      if (
        value.toLowerCase() ===
        label.toLowerCase()
      ) {
        return row[col + 1];
      }
    }
  }

  return null;
}

function isOperatorRow(row) {
  if (!row || row.length === 0) {
    return false;
  }

  const firstValue = normalize(row[0]).toUpperCase();

  return /^OPERATORE\s+\d+$/.test(firstValue);
}

function isTotalRow(row) {
  if (!row || row.length === 0) {
    return false;
  }

  return row.some(
    (cell) =>
      normalize(cell).toUpperCase() === "TOTALE"
  );
}

function isHeaderRow(row) {
  if (!row) {
    return false;
  }

  const values = row.map(normalize);

  return (
    values.includes("Product ID") &&
    values.includes("SKU FBA") &&
    values.includes("QTY to send")
  );
}

function parseAmazonFile(filePath) {
  const workbook = XLSX.readFile(filePath);

  if (!workbook.SheetNames.includes("Pronto alluso")) {
    throw new Error(
      'Il file Amazon non contiene il foglio "Pronto alluso".'
    );
  }

  const sheet =
    workbook.Sheets["Pronto alluso"];

  const rows = XLSX.utils.sheet_to_json(
    sheet,
    {
      header: 1,
      defval: null,
      raw: true
    }
  );

  // ----------------------------------------------------------
  // DATI ORDINE
  // ----------------------------------------------------------

  const orderNumber = findRowValue(
    rows,
    "Order Number:"
  );

  const responsible = findRowValue(
    rows,
    "Responsible:"
  );

  const numberOfOperators =
    normalizeNumber(
      findRowValue(
        rows,
        "Number of Operators:"
      )
    );

  if (!orderNumber) {
    throw new Error(
      "Order Number non trovato nel file Amazon."
    );
  }

  // ----------------------------------------------------------
  // OPERATORI + ITEMS
  // ----------------------------------------------------------

  const operators = [];
  const items = [];

  let currentOperator = null;
  let currentOperatorName = null;
  let currentHeader = null;

  for (let i = 0; i < rows.length; i++) {

    const row = rows[i];

    // --------------------------------------------------------
    // OPERATORE
    // --------------------------------------------------------

    if (isOperatorRow(row)) {

      currentOperatorName =
        normalize(row[0]);

      currentOperator = {
        name: currentOperatorName
      };

      operators.push(currentOperator);

      currentHeader = null;

      continue;
    }

    // --------------------------------------------------------
    // HEADER PRODOTTI
    // --------------------------------------------------------

    if (
      currentOperatorName &&
      isHeaderRow(row)
    ) {

      currentHeader = row.map(normalize);

      continue;
    }

    // --------------------------------------------------------
    // TOTALE
    // --------------------------------------------------------

    if (isTotalRow(row)) {
      currentHeader = null;
      continue;
    }

    // --------------------------------------------------------
    // PRODOTTO
    // --------------------------------------------------------

    if (
      currentOperatorName &&
      currentHeader
    ) { if (isTotalRow(row)) {
          currentHeader = null;
          continue;
        }

      const hasProductId =
        currentHeader.includes("Product ID");

      const hasProductName =
        currentHeader.includes(
          "Name of Product"
        );

      const hasQuantity =
        currentHeader.includes(
          "QTY to send"
        );

      if (
        !hasProductId &&
        !hasProductName &&
        !hasQuantity
      ) {
        continue;
      }

      const item = {};

      for (
        let col = 0;
        col < currentHeader.length;
        col++
      ) {

        const field =
          currentHeader[col];

        const value =
          row[col];

        if (!field) {
          continue;
        }

        switch (field) {

          case "Product ID":
            item.product_id =
              normalize(value);
            break;

          case "SKU FBA":
            item.sku_fba =
              normalize(value);
            break;

          case "EAN":
            item.ean =
              normalize(value);
            break;

          case "Name of Product":
            item.product_name =
              normalize(value);
            break;

          case "Number of pieces per box":
            item.pieces_per_box =
              normalizeNumber(value);
            break;

          case "Number of boxes":
            item.number_of_boxes =
              normalizeNumber(value);
            break;

          case "QTY to send":
            item.quantity =
              normalizeNumber(value);
            break;

          case "Note":
            item.note =
              normalize(value);
            break;

          default:
            break;
        }
      }

      // ------------------------------------------------------
      // IGNORA RIGHE VUOTE
      // ------------------------------------------------------

      const hasUsefulData =
        item.product_id ||
        item.sku_fba ||
        item.ean ||
        item.product_name ||
        item.quantity !== null &&
        item.quantity !== undefined;

      if (!hasUsefulData) {
        continue;
      }

      item.operator_name =
        currentOperatorName;

      items.push(item);
    }
  }

  // ----------------------------------------------------------
  // CONTROLLO OPERATORI
  // ----------------------------------------------------------

  if (operators.length === 0) {
    throw new Error(
      "Nessun operatore trovato nel file Amazon."
    );
  }

  if (items.length === 0) {
    throw new Error(
      "Nessun prodotto trovato nel file Amazon."
    );
  }

  // ----------------------------------------------------------
  // RISULTATO
  // ----------------------------------------------------------

  return {
    order_number:
      normalize(orderNumber),

    responsible:
      normalize(responsible),

    number_of_operators:
      numberOfOperators,

    order_type:
      "AMAZON_FBA",

    operation_type:
      "INSPECTION",

    operators,

    items
  };
}

module.exports = {
  parseAmazonFile
};