import * as xlsx from "xlsx";
import csvParser from "csv-parser";
import { Readable } from "stream";

export type TableRows = {
  rows: { Column1: string; Column2: string }[];
};

interface FilteredRow {
  [key: string]: string;
}

/**
 * Extracts specified columns from an .xlsx or .csv file provided as a Blob or Buffer.
 * @param fileBuffer - The file as a Blob or Buffer.
 * @param fileType - The type of file (e.g., 'xlsx' or 'csv').
 * @param columns - Array of column names to retrieve.
 * @returns Promise resolving to an array of objects containing the specified columns.
 */
export async function extractColumns(
  fileBuffer: Buffer | Blob,
  fileType: string,
  columns: string[]
): Promise<FilteredRow[]> {
  if (!fileType) {
    throw new Error("File type must be specified.");
  }

  const extension = fileType.toLowerCase();

  if (
    extension ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return processXlsx(fileBuffer as Blob, columns);
  } else if (extension === "text/csv") {
    const buffer =
      fileBuffer instanceof Blob ? await blobToBuffer(fileBuffer) : fileBuffer;
    return processCsv(buffer, columns);
  } else {
    throw new Error(`Unsupported file format: .${extension}`);
  }
}

async function processXlsx(blob: Blob, columns: string[]): FilteredRow[] {
  const buffer = await blob.arrayBuffer();
  const workbook = xlsx.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData: Record<string, string>[] = xlsx.utils.sheet_to_json(sheet);

  // Filter data to only include specified columns
  // return jsonData.map((row) => {
  //   const filteredRow: FilteredRow = {};
  //   columns.forEach((column) => {
  //     if (row[column] !== undefined) {
  //       filteredRow[column] = row[column];
  //     }
  //   });
  //   return filteredRow;
  // });

  return jsonData.map((row) => {
    const [key1, key2] = Object.keys(row);
    return {
      Column1: key1 && row[key1] !== undefined ? row[key1] : null,
      Column2: key2 && row[key2] !== undefined ? row[key2] : null,
    };
  });
}

function processCsv(
  fileBuffer: Buffer,
  columns: string[]
): Promise<FilteredRow[]> {
  return new Promise((resolve, reject) => {
    const results: FilteredRow[] = [];

    const stream = Readable.from(fileBuffer);
    stream
      .pipe(csvParser())
      .on("data", (row: Record<string, any>) => {
        // const filteredRow: FilteredRow = {};
        // columns.forEach((column) => {
        //   if (row[column] !== undefined) {
        //     filteredRow[column] = row[column];
        //   }
        // });
        // results.push(filteredRow);

        const keys = Object.keys(row);
        results.push({
          Column1: keys[0] ? row[keys[0]] : null,
          Column2: keys[1] ? row[keys[1]] : null,
        });
      })
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(new Uint8Array(arrayBuffer));
}
