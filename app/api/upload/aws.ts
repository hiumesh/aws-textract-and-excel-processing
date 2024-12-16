// Import necessary AWS SDK package
import { Block } from "@aws-sdk/client-textract";

export type ProcessedData = {
  text: { Text: string; Confidence?: number }[];
  forms: { Key: string; Value: string; Confidence?: number }[];
  tables: { Text: string; Confidence?: number }[][][];
  queries: { Query: string; Result: string; Confidence?: number }[];
};

/**
 * Process AWS Textract AnalyzeDocumentCommand output
 * @param data - The output from AnalyzeDocumentCommand
 * @returns Processed data containing text, forms, and tables
 */
export function processAnalyzeDocumentData(data: {
  Blocks: Block[];
}): ProcessedData {
  if (!data || !data.Blocks) {
    throw new Error(
      "Invalid input: Missing Blocks in AnalyzeDocumentCommand output."
    );
  }

  const blockMap: Map<string, Block> = new Map();
  const results: ProcessedData = {
    text: [],
    forms: [],
    tables: [],
    queries: [],
  };

  // Map blocks by their Id for quick lookup
  data.Blocks.forEach((block) => {
    if (block.Id) blockMap.set(block.Id, block);
  });

  // Process blocks
  data.Blocks.forEach((block) => {
    switch (block.BlockType) {
      case "KEY_VALUE_SET":
        if (block.EntityTypes?.includes("KEY")) {
          const key = extractText(block, blockMap);
          const value = extractValue(block, blockMap);
          const confidence = block.Confidence;

          if (key) {
            results.forms.push({
              Key: key,
              Value: value,
              Confidence: confidence as number,
            });
          }
        }
        break;
      // case "TABLE":
      //   const table = extractTable(block, blockMap);
      //   if (table) {
      //     results.tables.push(table);
      //   }
      //   break;
      case "LINE":
        if (block.Text) {
          results.text.push({
            Text: block.Text,
            Confidence: block.Confidence as number,
          });
        }
        break;
      case "QUERY":
        const queryText = block.Query?.Text || "";
        const queryResultBlock = findQueryResultBlock(block, blockMap);
        if (queryResultBlock) {
          results.queries.push({
            Query: queryText,
            Result: queryResultBlock.Text || "",
            Confidence: queryResultBlock.Confidence as number,
          });
        }
        break;
    }
  });

  return results;
}

/**
 * Find the QUERY_RESULT block for a given QUERY block
 * @param block - The QUERY block
 * @param blockMap - Map of block Ids to blocks
 * @returns The QUERY_RESULT block, if found
 */
function findQueryResultBlock(
  block: Block,
  blockMap: Map<string, Block>
): Block | undefined {
  if (!block.Relationships) return undefined;

  for (const relationship of block.Relationships) {
    if (relationship.Type === "ANSWER" && relationship.Ids) {
      for (const answerId of relationship.Ids) {
        const answerBlock = blockMap.get(answerId);
        if (answerBlock && answerBlock.BlockType === "QUERY_RESULT") {
          return answerBlock;
        }
      }
    }
  }

  return undefined;
}

/**
 * Extract text for a given block
 * @param block - The current block
 * @param blockMap - Map of block Ids to blocks
 * @returns The extracted text
 */
function extractText(block?: Block, blockMap?: Map<string, Block>): string {
  if (!block?.Relationships) return "";

  let text = "";

  block.Relationships.forEach((relationship) => {
    if (relationship.Type === "CHILD" && relationship.Ids) {
      relationship.Ids.forEach((childId) => {
        const childBlock = blockMap?.get(childId);
        if (childBlock && childBlock.BlockType === "WORD") {
          text += `${childBlock.Text} `;
        }
      });
    }
  });

  return text.trim();
}

/**
 * Extract value text for a given block
 * @param block - The current block
 * @param blockMap - Map of block Ids to blocks
 * @returns The extracted value text
 */
function extractValue(block: Block, blockMap: Map<string, Block>): string {
  if (!block.Relationships) return "";

  for (const relationship of block.Relationships) {
    if (relationship.Type === "VALUE" && relationship.Ids) {
      for (const valueId of relationship.Ids) {
        const valueBlock = blockMap.get(valueId);
        return extractText(valueBlock, blockMap);
      }
    }
  }

  return "";
}

/**
 * Extract table data for a given block
 * @param block - The current table block
 * @param blockMap - Map of block Ids to blocks
 * @returns Array of rows with cells containing text and confidence
 */
// function extractTable(
//   block: Block,
//   blockMap: Map<string, Block>
// ): { Rows: { Cells: { Text: string; Confidence?: number }[] }[] } {
//   const table: { Rows: { Cells: { Text: string; Confidence?: number }[] }[] } =
//     {
//       Rows: [],
//     };

//   if (!block.Relationships) return table;

//   block.Relationships.forEach((relationship) => {
//     if (relationship.Type === "CHILD" && relationship.Ids) {
//       relationship.Ids.forEach((rowId) => {
//         const rowBlock = blockMap.get(rowId);
//         if (
//           rowBlock &&
//           "BlockType" in rowBlock &&
//           rowBlock.BlockType !== undefined &&
//           rowBlock.BlockType === ("ROW" as BlockType)
//         ) {
//           const row: { Cells: { Text: string; Confidence?: number }[] } = {
//             Cells: [],
//           };

//           rowBlock.Relationships?.forEach((rowRelationship) => {
//             if (rowRelationship.Type === "CHILD" && rowRelationship.Ids) {
//               rowRelationship.Ids.forEach((cellId) => {
//                 const cellBlock = blockMap.get(cellId);
//                 if (cellBlock && cellBlock.BlockType === "CELL") {
//                   const cellText = extractText(cellBlock, blockMap);
//                   row.Cells.push({
//                     Text: cellText,
//                     Confidence: cellBlock.Confidence,
//                   });
//                 }
//               });
//             }
//           });

//           table.Rows.push(row);
//         }
//       });
//     }
//   });

//   return table;
// }
